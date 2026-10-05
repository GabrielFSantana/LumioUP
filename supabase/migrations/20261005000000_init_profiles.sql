-- Etapa 3: perfis, configurações e consentimentos, com RLS.
-- Regra geral: cada usuário só enxerga e altera as próprias linhas.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 200),
  experience_level text not null default 'beginner'
    check (experience_level in ('beginner', 'advanced')),
  currency text not null default 'BRL' check (currency = 'BRL'),
  timezone text not null default 'America/Sao_Paulo',
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  -- Privacidade: valores financeiros nunca são compartilhados por padrão.
  show_in_club_ranking boolean not null default true,
  share_amounts_with_clubs boolean not null default false,
  biometric_lock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('terms', 'privacy', 'ranking_amounts')),
  version text not null,
  accepted_at timestamptz not null default now()
);
create index consents_profile_id_idx on public.consents (profile_id);

-- updated_at automático
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Cria perfil, configurações e consentimentos no cadastro.
-- Lê apenas campos conhecidos de raw_user_meta_data; nada é executado a partir deles.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := nullif(btrim(coalesce(meta ->> 'display_name', '')), '');
  terms_version text := nullif(meta ->> 'accepted_terms_version', '');
begin
  if name is null then
    name := split_part(coalesce(new.email, 'Usuário'), '@', 1);
  end if;
  name := left(coalesce(nullif(name, ''), 'Usuário'), 60);

  insert into public.profiles (id, display_name) values (new.id, name);
  insert into public.user_settings (profile_id) values (new.id);

  if terms_version is not null then
    insert into public.consents (profile_id, type, version)
    values (new.id, 'terms', terms_version), (new.id, 'privacy', terms_version);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS: negado por padrão; políticas explícitas por operação.
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.consents enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Sem insert (feito pelo gatilho) e sem delete (exclusão de conta é uma função própria, Etapa 16).

create policy user_settings_select_own on public.user_settings
  for select to authenticated using (profile_id = (select auth.uid()));
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy consents_select_own on public.consents
  for select to authenticated using (profile_id = (select auth.uid()));
create policy consents_insert_own on public.consents
  for insert to authenticated with check (profile_id = (select auth.uid()));
-- Consentimentos são um registro histórico: sem update e sem delete.

-- Privilégios mínimos: anon não acessa nada; authenticated só o necessário.
revoke all on public.profiles, public.user_settings, public.consents from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, update on public.user_settings to authenticated;
grant select, insert on public.consents to authenticated;
