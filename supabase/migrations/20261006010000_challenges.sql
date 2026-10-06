-- Etapa 13: desafios coletivos e ranking dos clubes.
-- Desafios medem AÇÕES (dias com atividade, lançamentos, contribuições), nunca valores em reais.
-- O progresso é calculado no servidor a partir do XP e dos dias de atividade já registrados;
-- o app só lê. O ranking é por XP/consistência e respeita "Aparecer no ranking dos clubes".

-- ===== XP do desafio =====
insert into public.xp_rules (source, xp, daily_cap, label, description) values
  ('challenge_done', 40, 2, 'Desafio concluído', 'Complete um desafio do seu clube.');

-- ===== Tabelas =====
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('log_days', 'log_count', 'goal_contributions')),
  title text not null check (char_length(btrim(title)) between 1 and 60),
  starts_on date not null,
  ends_on date not null,
  target integer not null check (target between 1 and 100),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on - starts_on <= 89),
  check (case kind
    when 'log_days' then target between 3 and ends_on - starts_on + 1
    when 'log_count' then target >= 5
    else target >= 2 end)
);
create index challenges_club_idx on public.challenges (club_id, ends_on desc);

create table public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- Dia (no fuso do usuário) em que entrou: só conta o que foi feito a partir dele.
  joined_on date not null,
  completed_at timestamptz,
  primary key (challenge_id, profile_id)
);
create index challenge_participants_profile_idx on public.challenge_participants (profile_id);

-- ===== Funções internas =====

-- Quantas ações o usuário fez no desafio (a partir do dia em que entrou).
create function public.challenge_count(p_challenge uuid, p_profile uuid) returns integer
language plpgsql stable security definer set search_path = ''
as $$
declare
  c record;
  pp record;
  from_day date;
  n integer;
begin
  select * into c from public.challenges where id = p_challenge;
  if not found then return 0; end if;
  select * into pp from public.challenge_participants
    where challenge_id = p_challenge and profile_id = p_profile;
  if not found then return 0; end if;
  from_day := greatest(c.starts_on, pp.joined_on);
  if c.kind = 'log_days' then
    select count(*) into n from public.activity_days
      where profile_id = p_profile and day between from_day and c.ends_on;
  else
    select count(*) into n from public.xp_events
      where profile_id = p_profile
        and source = case c.kind when 'log_count' then 'transaction_created' else 'goal_contribution' end
        and awarded_on between from_day and c.ends_on;
  end if;
  return n;
end;
$$;

-- Conclui os desafios em andamento que atingiram a meta e concede o XP (uma vez por desafio).
-- O XP só vale em clube com 2+ membros, para não render XP com clubes de uma pessoa só.
create function public.refresh_challenges(p_profile uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  today date := public.local_today(p_profile);
begin
  for r in
    select c.id, c.club_id, c.target
    from public.challenge_participants pp
    join public.challenges c on c.id = pp.challenge_id
    where pp.profile_id = p_profile and pp.completed_at is null
      and today between c.starts_on and c.ends_on
  loop
    if public.challenge_count(r.id, p_profile) >= r.target then
      update public.challenge_participants set completed_at = now()
        where challenge_id = r.id and profile_id = p_profile;
      if (select count(*) from public.club_members where club_id = r.club_id) >= 2 then
        perform public.award_xp(p_profile, 'challenge_done', r.id, 'challenge:' || r.id);
      end if;
    end if;
  end loop;
end;
$$;

create function public.challenges_on_activity() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.refresh_challenges(new.profile_id);
  return null;
end;
$$;

create trigger challenges_on_activity_day after insert on public.activity_days
  for each row execute function public.challenges_on_activity();

create trigger challenges_on_xp_event after insert on public.xp_events
  for each row when (new.source in ('transaction_created', 'goal_contribution'))
  execute function public.challenges_on_activity();

-- ===== Funções do app =====

create function public.create_challenge(
  p_club uuid, p_kind text, p_title text, p_starts_on date, p_ends_on date, p_target integer
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  today date := public.local_today((select auth.uid()));
  t text := btrim(coalesce(p_title, ''));
  new_id uuid;
begin
  if me is null or coalesce(public.club_role_of(p_club), '') not in ('owner', 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(t) < 1 or char_length(t) > 60 then
    raise exception 'invalid_title' using errcode = 'P0001';
  end if;
  if p_kind is null or p_kind not in ('log_days', 'log_count', 'goal_contributions') then
    raise exception 'invalid_kind' using errcode = 'P0001';
  end if;
  if p_starts_on is null or p_ends_on is null or p_starts_on < today
     or p_ends_on < p_starts_on or p_ends_on - p_starts_on > 89 then
    raise exception 'invalid_dates' using errcode = 'P0001';
  end if;
  if p_target is null or p_target < 1 or p_target > 100
     or (p_kind = 'log_days' and (p_target < 3 or p_target > p_ends_on - p_starts_on + 1))
     or (p_kind = 'log_count' and p_target < 5)
     or (p_kind = 'goal_contributions' and p_target < 2) then
    raise exception 'invalid_target' using errcode = 'P0001';
  end if;
  if (select count(*) from public.challenges where club_id = p_club and ends_on >= today) >= 5 then
    raise exception 'too_many_challenges' using errcode = 'P0001';
  end if;

  insert into public.challenges (club_id, created_by, kind, title, starts_on, ends_on, target)
  values (p_club, me, p_kind, t, p_starts_on, p_ends_on, p_target)
  returning id into new_id;
  insert into public.challenge_participants (challenge_id, profile_id, joined_on)
  values (new_id, me, today);
  return new_id;
end;
$$;

create function public.delete_challenge(p_challenge uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
  me uuid := (select auth.uid());
begin
  select * into c from public.challenges where id = p_challenge;
  if not found or me is null
     or not (coalesce(public.club_role_of(c.club_id), '') in ('owner', 'admin') or c.created_by = me)
     or not public.is_club_member(c.club_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  delete from public.challenges where id = p_challenge;
end;
$$;

create function public.join_challenge(p_challenge uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  c record;
  me uuid := (select auth.uid());
  today date := public.local_today((select auth.uid()));
begin
  select * into c from public.challenges where id = p_challenge;
  if not found or me is null or not public.is_club_member(c.club_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if today > c.ends_on then
    raise exception 'challenge_ended' using errcode = 'P0001';
  end if;
  insert into public.challenge_participants (challenge_id, profile_id, joined_on)
  values (p_challenge, me, today)
  on conflict do nothing;
end;
$$;

create function public.leave_challenge(p_challenge uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.challenge_participants
  where challenge_id = p_challenge and profile_id = (select auth.uid());
end;
$$;

create function public.list_challenges(p_club uuid)
returns table (
  id uuid, kind text, title text, starts_on date, ends_on date, target integer,
  created_by uuid, status text, participant_count integer, completed_count integer,
  joined boolean, my_count integer, my_completed_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  today date := public.local_today((select auth.uid()));
begin
  if not public.is_club_member(p_club) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return query
    select c.id, c.kind, c.title, c.starts_on, c.ends_on, c.target, c.created_by,
      case when today > c.ends_on then 'ended' when today < c.starts_on then 'upcoming' else 'active' end,
      (select count(*)::integer from public.challenge_participants x where x.challenge_id = c.id),
      (select count(*)::integer from public.challenge_participants x
        where x.challenge_id = c.id and x.completed_at is not null),
      mine.profile_id is not null,
      case when mine.profile_id is not null then public.challenge_count(c.id, me) else 0 end,
      mine.completed_at
    from public.challenges c
    left join public.challenge_participants mine
      on mine.challenge_id = c.id and mine.profile_id = me
    where c.club_id = p_club
    order by case when today > c.ends_on then 2 when today < c.starts_on then 1 else 0 end,
      c.ends_on, c.created_at;
end;
$$;

-- Placar do desafio: só ações e percentual. Quem desligou "Aparecer no ranking" some do placar
-- dos outros (a própria linha sempre aparece).
create function public.challenge_standings(p_challenge uuid)
returns table (
  profile_id uuid, display_name text, action_count integer, progress_pct integer,
  completed boolean, is_self boolean
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  c record;
  me uuid := (select auth.uid());
begin
  select * into c from public.challenges where id = p_challenge;
  if not found or not public.is_club_member(c.club_id) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  return query
    select x.profile_id, p.display_name, x.n,
      least(100, (x.n * 100) / c.target)::integer,
      x.completed_at is not null, x.profile_id = me
    from (
      select pp.profile_id, pp.completed_at, public.challenge_count(p_challenge, pp.profile_id) as n
      from public.challenge_participants pp where pp.challenge_id = p_challenge
    ) x
    join public.profiles p on p.id = x.profile_id
    left join public.user_settings us on us.profile_id = x.profile_id
    where coalesce(us.show_in_club_ranking, true) or x.profile_id = me
    order by (x.completed_at is not null) desc, x.n desc, p.display_name;
end;
$$;

-- Ranking do clube por período ('week' = semana desde domingo, 'month', 'all').
-- Só XP, consistência, missões e conquistas. Quem optou por sair não aparece para os outros
-- (a própria linha aparece, sem posição).
create function public.club_ranking(p_club uuid, p_period text)
returns table (
  profile_id uuid, display_name text, xp integer, level integer, current_streak integer,
  missions_completed integer, achievements integer, rank integer, is_self boolean
)
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  today date := public.local_today((select auth.uid()));
  start_day date;
begin
  if not public.is_club_member(p_club) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;
  if p_period not in ('week', 'month', 'all') then
    raise exception 'invalid_period' using errcode = 'P0001';
  end if;
  start_day := case p_period
    when 'week' then today - extract(dow from today)::integer
    when 'month' then date_trunc('month', today)::date
    else date '1900-01-01' end;

  return query
    with base as (
      select m.profile_id as pid, p.display_name as dname,
        coalesce(us.show_in_club_ranking, true) as opted_in,
        coalesce(st.level, 1) as lvl,
        case when st.last_active_on >= today - 1 then st.current_streak else 0 end as streak,
        coalesce((select sum(e.xp) from public.xp_events e
          where e.profile_id = m.profile_id and e.awarded_on >= start_day), 0)::integer as period_xp,
        (select count(*) from public.user_missions um
          where um.profile_id = m.profile_id and um.completed_at is not null
            and (um.completed_at at time zone coalesce(p.timezone, 'America/Sao_Paulo'))::date >= start_day
        )::integer as missions,
        (select count(*) from public.user_achievements ua
          where ua.profile_id = m.profile_id
            and (ua.unlocked_at at time zone coalesce(p.timezone, 'America/Sao_Paulo'))::date >= start_day
        )::integer as achvs
      from public.club_members m
      join public.profiles p on p.id = m.profile_id
      left join public.user_settings us on us.profile_id = m.profile_id
      left join public.user_stats st on st.profile_id = m.profile_id
      where m.club_id = p_club
    )
    select b.pid, b.dname, b.period_xp, b.lvl, b.streak, b.missions, b.achvs,
      case when b.opted_in
        then (rank() over (partition by b.opted_in order by b.period_xp desc, b.streak desc))::integer
      end,
      b.pid = me
    from base b
    where b.opted_in or b.pid = me
    order by 8 nulls last, b.dname;
end;
$$;

-- ===== Permissões =====
revoke execute on function public.challenge_count(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.refresh_challenges(uuid) from public, anon, authenticated;
revoke execute on function public.challenges_on_activity() from public, anon, authenticated;

revoke execute on function public.create_challenge(uuid, text, text, date, date, integer) from public, anon;
revoke execute on function public.delete_challenge(uuid) from public, anon;
revoke execute on function public.join_challenge(uuid) from public, anon;
revoke execute on function public.leave_challenge(uuid) from public, anon;
revoke execute on function public.list_challenges(uuid) from public, anon;
revoke execute on function public.challenge_standings(uuid) from public, anon;
revoke execute on function public.club_ranking(uuid, text) from public, anon;

grant execute on function public.create_challenge(uuid, text, text, date, date, integer) to authenticated;
grant execute on function public.delete_challenge(uuid) to authenticated;
grant execute on function public.join_challenge(uuid) to authenticated;
grant execute on function public.leave_challenge(uuid) to authenticated;
grant execute on function public.list_challenges(uuid) to authenticated;
grant execute on function public.challenge_standings(uuid) to authenticated;
grant execute on function public.club_ranking(uuid, text) to authenticated;

alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;

create policy challenges_select_member on public.challenges
  for select to authenticated using (public.is_club_member(club_id));

revoke all on public.challenges, public.challenge_participants from anon, authenticated;
grant select on public.challenges to authenticated;
