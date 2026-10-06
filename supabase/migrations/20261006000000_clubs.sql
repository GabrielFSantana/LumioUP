-- Etapa 12: clubes.
-- PRIVACIDADE: clubes não têm nenhuma coluna financeira. Quem não é membro não lê nada.
-- Toda alteração é feita por funções (security definer) que checam o papel do usuário;
-- os usuários não têm permissão de escrita direta nas tabelas de clube.
-- Entre membros só circulam dados não financeiros: nome, papel, nível, XP e sequência
-- (e só quando o próprio usuário permite aparecer no ranking).

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  description text check (description is null or char_length(description) <= 200),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  invite_code text not null unique check (invite_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  invites_enabled boolean not null default true,
  max_members integer not null default 20 check (max_members between 2 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (club_id, profile_id)
);
create index club_members_profile_idx on public.club_members (profile_id);
-- Exatamente um dono por clube.
create unique index club_members_one_owner_idx on public.club_members (club_id) where role = 'owner';

-- Tentativas de código inválido (limite de força bruta). Sem acesso para os usuários.
create table public.club_join_attempts (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index club_join_attempts_profile_idx on public.club_join_attempts (profile_id, attempted_at desc);

create trigger clubs_set_updated_at before update on public.clubs
  for each row execute function public.set_updated_at();

-- ===== Auxiliares =====

create function public.is_club_member(p_club uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club and profile_id = (select auth.uid()));
$$;

create function public.club_role_of(p_club uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.club_members
  where club_id = p_club and profile_id = (select auth.uid());
$$;

create function public.normalize_invite_code(p_code text) returns text
language sql immutable set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

-- Código de 8 caracteres de um alfabeto sem ambiguidades (sem I, O, 0 e 1), a partir dos bytes
-- aleatórios de um UUID v4 (pulando os bytes fixos de versão e variante).
create function public.generate_invite_code() returns text
language plpgsql volatile set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  b bytea;
  i integer;
  tries integer := 0;
begin
  loop
    b := uuid_send(gen_random_uuid());
    code := '';
    foreach i in array array[0, 1, 2, 3, 4, 5, 10, 11] loop
      code := code || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.clubs where invite_code = code);
    tries := tries + 1;
    if tries > 20 then raise exception 'code_generation_failed' using errcode = 'P0001'; end if;
  end loop;
  return code;
end;
$$;

-- Limite de tentativas inválidas: 10 por hora por usuário.
create function public.assert_join_rate(p_profile uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.club_join_attempts where attempted_at < now() - interval '1 day';
  if (select count(*) from public.club_join_attempts
      where profile_id = p_profile and attempted_at > now() - interval '1 hour') >= 10 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;
end;
$$;

-- ===== Criar, editar, apagar =====

create function public.create_club(p_name text, p_description text default null) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  club uuid;
  clean_name text := btrim(coalesce(p_name, ''));
  clean_desc text := nullif(btrim(coalesce(p_description, '')), '');
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if char_length(clean_name) not between 1 and 40 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if clean_desc is not null and char_length(clean_desc) > 200 then
    raise exception 'invalid_description' using errcode = 'P0001';
  end if;
  if (select count(*) from public.clubs where owner_id = uid) >= 5 then
    raise exception 'club_limit_owned' using errcode = 'P0001';
  end if;
  if (select count(*) from public.club_members where profile_id = uid) >= 10 then
    raise exception 'club_limit_member' using errcode = 'P0001';
  end if;

  insert into public.clubs (name, description, owner_id, invite_code)
  values (clean_name, clean_desc, uid, public.generate_invite_code())
  returning id into club;
  insert into public.club_members (club_id, profile_id, role) values (club, uid, 'owner');
  return club;
end;
$$;

create function public.update_club(
  p_club uuid, p_name text, p_description text, p_invites_enabled boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  role text := public.club_role_of(p_club);
  clean_name text := btrim(coalesce(p_name, ''));
  clean_desc text := nullif(btrim(coalesce(p_description, '')), '');
begin
  if role is null or role not in ('owner', 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(clean_name) not between 1 and 40 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if clean_desc is not null and char_length(clean_desc) > 200 then
    raise exception 'invalid_description' using errcode = 'P0001';
  end if;
  update public.clubs
    set name = clean_name, description = clean_desc,
        invites_enabled = coalesce(p_invites_enabled, invites_enabled)
    where id = p_club;
end;
$$;

create function public.regenerate_invite_code(p_club uuid) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  role text := public.club_role_of(p_club);
  code text;
begin
  if role is null or role not in ('owner', 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  code := public.generate_invite_code();
  update public.clubs set invite_code = code where id = p_club;
  return code;
end;
$$;

create function public.delete_club(p_club uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if public.club_role_of(p_club) is distinct from 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  delete from public.clubs where id = p_club;
end;
$$;

-- ===== Entrar =====

-- Pré-visualização por código: só nome e quantidade de membros. Código inválido não retorna nada
-- (e conta como tentativa); sem erro, para a tentativa continuar registrada.
create function public.preview_club(p_code text)
returns table (club_id uuid, name text, member_count integer, max_members integer,
               is_full boolean, invites_enabled boolean)
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  code text := public.normalize_invite_code(p_code);
  found_club record;
  members integer;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform public.assert_join_rate(uid);
  select c.id, c.name, c.max_members, c.invites_enabled into found_club
    from public.clubs c where c.invite_code = code;
  if not found then
    insert into public.club_join_attempts (profile_id) values (uid);
    return;
  end if;
  select count(*) into members from public.club_members m where m.club_id = found_club.id;
  return query select found_club.id, found_club.name, members, found_club.max_members,
    members >= found_club.max_members, found_club.invites_enabled;
end;
$$;

-- Entra no clube pelo código. Código inválido devolve null (e conta como tentativa).
create function public.join_club(p_code text) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  code text := public.normalize_invite_code(p_code);
  c record;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  perform public.assert_join_rate(uid);
  select id, max_members, invites_enabled into c from public.clubs where invite_code = code;
  if not found then
    insert into public.club_join_attempts (profile_id) values (uid);
    return null;
  end if;
  if exists (select 1 from public.club_members where club_id = c.id and profile_id = uid) then
    return c.id;
  end if;
  if not c.invites_enabled then raise exception 'invites_disabled' using errcode = 'P0001'; end if;
  if (select count(*) from public.club_members where club_id = c.id) >= c.max_members then
    raise exception 'club_full' using errcode = 'P0001';
  end if;
  if (select count(*) from public.club_members where profile_id = uid) >= 10 then
    raise exception 'club_limit_member' using errcode = 'P0001';
  end if;
  insert into public.club_members (club_id, profile_id, role) values (c.id, uid, 'member');
  return c.id;
end;
$$;

-- ===== Sair, remover, papéis =====

create function public.leave_club(p_club uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  role text := public.club_role_of(p_club);
begin
  if role is null then raise exception 'not_a_member' using errcode = '42501'; end if;
  if role = 'owner' then
    if (select count(*) from public.club_members where club_id = p_club) = 1 then
      delete from public.clubs where id = p_club;
      return;
    end if;
    raise exception 'owner_must_transfer' using errcode = 'P0001';
  end if;
  delete from public.club_members where club_id = p_club and profile_id = uid;
end;
$$;

-- Dono remove admins e membros; admin remove só membros. Ninguém remove o dono nem a si mesmo.
create function public.remove_member(p_club uuid, p_profile uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  actor text := public.club_role_of(p_club);
  target text;
begin
  select role into target from public.club_members where club_id = p_club and profile_id = p_profile;
  if actor is null or target is null or p_profile = (select auth.uid()) or target = 'owner'
     or actor = 'member' or (actor = 'admin' and target <> 'member') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  delete from public.club_members where club_id = p_club and profile_id = p_profile;
end;
$$;

create function public.set_member_role(p_club uuid, p_profile uuid, p_role text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  target text;
begin
  if public.club_role_of(p_club) is distinct from 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;
  select role into target from public.club_members where club_id = p_club and profile_id = p_profile;
  if target is null or target = 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.club_members set role = p_role where club_id = p_club and profile_id = p_profile;
end;
$$;

create function public.transfer_ownership(p_club uuid, p_profile uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if public.club_role_of(p_club) is distinct from 'owner' or p_profile = uid then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.club_members where club_id = p_club and profile_id = p_profile) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.club_members set role = 'admin' where club_id = p_club and profile_id = uid;
  update public.club_members set role = 'owner' where club_id = p_club and profile_id = p_profile;
  update public.clubs set owner_id = p_profile where id = p_club;
end;
$$;

-- ===== Leitura (só membros) =====

create function public.list_my_clubs()
returns table (club_id uuid, name text, description text, role text, member_count integer,
               invite_code text, invites_enabled boolean, max_members integer, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.name, c.description, m.role,
    (select count(*)::integer from public.club_members x where x.club_id = c.id),
    c.invite_code, c.invites_enabled, c.max_members, c.created_at
  from public.club_members m
  join public.clubs c on c.id = m.club_id
  where m.profile_id = (select auth.uid())
  order by c.created_at;
$$;

-- Membros do clube com SOMENTE dados não financeiros. Nível, XP e sequência só aparecem para quem
-- aceitou aparecer no ranking (e sempre para o próprio usuário).
create function public.list_club_members(p_club uuid)
returns table (profile_id uuid, display_name text, avatar_url text, role text, joined_at timestamptz,
               level integer, total_xp integer, current_streak integer)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_club_member(p_club) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return query
    select m.profile_id, p.display_name, p.avatar_url, m.role, m.joined_at,
      case when shown then st.level end,
      case when shown then st.total_xp::integer end,
      case when shown then st.current_streak end
    from public.club_members m
    join public.profiles p on p.id = m.profile_id
    left join public.user_settings us on us.profile_id = m.profile_id
    left join public.user_stats st on st.profile_id = m.profile_id
    cross join lateral (
      select coalesce(us.show_in_club_ranking, true) or m.profile_id = (select auth.uid()) as shown
    ) v(shown)
    where m.club_id = p_club
    order by case m.role when 'owner' then 0 when 'admin' then 1 else 2 end, p.display_name;
end;
$$;

-- ===== Permissões =====
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_join_attempts enable row level security;

create policy clubs_select_member on public.clubs
  for select to authenticated using (public.is_club_member(id));
create policy club_members_select_member on public.club_members
  for select to authenticated using (public.is_club_member(club_id));

revoke all on public.clubs, public.club_members, public.club_join_attempts from anon, authenticated;
grant select on public.clubs, public.club_members to authenticated;

-- Funções internas: ninguém as chama diretamente (só outras funções).
revoke execute on function public.generate_invite_code() from public, anon, authenticated;
revoke execute on function public.assert_join_rate(uuid) from public, anon, authenticated;
revoke execute on function public.normalize_invite_code(text) from public, anon;

-- Funções públicas do app: apenas usuários autenticados.
revoke execute on function public.is_club_member(uuid) from public, anon;
revoke execute on function public.club_role_of(uuid) from public, anon;
revoke execute on function public.create_club(text, text) from public, anon;
revoke execute on function public.update_club(uuid, text, text, boolean) from public, anon;
revoke execute on function public.regenerate_invite_code(uuid) from public, anon;
revoke execute on function public.delete_club(uuid) from public, anon;
revoke execute on function public.preview_club(text) from public, anon;
revoke execute on function public.join_club(text) from public, anon;
revoke execute on function public.leave_club(uuid) from public, anon;
revoke execute on function public.remove_member(uuid, uuid) from public, anon;
revoke execute on function public.set_member_role(uuid, uuid, text) from public, anon;
revoke execute on function public.transfer_ownership(uuid, uuid) from public, anon;
revoke execute on function public.list_my_clubs() from public, anon;
revoke execute on function public.list_club_members(uuid) from public, anon;

grant execute on function public.is_club_member(uuid) to authenticated;
grant execute on function public.club_role_of(uuid) to authenticated;
grant execute on function public.normalize_invite_code(text) to authenticated;
grant execute on function public.create_club(text, text) to authenticated;
grant execute on function public.update_club(uuid, text, text, boolean) to authenticated;
grant execute on function public.regenerate_invite_code(uuid) to authenticated;
grant execute on function public.delete_club(uuid) to authenticated;
grant execute on function public.preview_club(text) to authenticated;
grant execute on function public.join_club(text) to authenticated;
grant execute on function public.leave_club(uuid) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;
grant execute on function public.list_my_clubs() to authenticated;
grant execute on function public.list_club_members(uuid) to authenticated;
