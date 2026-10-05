-- Etapa 10: XP e níveis.
-- O XP é concedido SOMENTE por gatilhos no servidor. O app lê, nunca escreve.
-- Nunca depende de valores em reais: premia ações (organização, aprendizado, consistência).

-- Regras (configuração): quanto vale cada ação e quantas vezes por dia ela rende XP.
create table public.xp_rules (
  source text primary key,
  xp integer not null check (xp > 0),
  -- Máximo de eventos que rendem XP por dia (no fuso do usuário); nulo = sem limite diário.
  daily_cap integer check (daily_cap is null or daily_cap > 0),
  label text not null,
  description text not null,
  enabled boolean not null default true
);

insert into public.xp_rules (source, xp, daily_cap, label, description) values
  ('transaction_created', 10, 5, 'Lançamento registrado', 'Registre uma receita, gasto ou investimento.'),
  ('goal_created', 20, 1, 'Meta criada', 'Defina uma meta financeira.'),
  ('goal_contribution', 5, 2, 'Guardou para uma meta', 'Registre uma contribuição em uma meta.'),
  ('goal_completed', 50, null, 'Meta concluída', 'Chegue ao valor de uma meta.');

-- Níveis (configuração).
create table public.levels (
  level integer primary key check (level >= 1),
  name text not null,
  min_xp integer not null unique check (min_xp >= 0)
);

insert into public.levels (level, name, min_xp) values
  (1, 'Curioso Financeiro', 0),
  (2, 'Organizador', 100),
  (3, 'Poupador', 250),
  (4, 'Planejador', 500),
  (5, 'Investidor Iniciante', 900),
  (6, 'Investidor Consistente', 1500),
  (7, 'Estrategista Financeiro', 2400),
  (8, 'Mestre da Jornada Financeira', 3600);

-- Livro-razão de XP: imutável, uma linha por ganho.
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source text not null references public.xp_rules (source),
  ref_id uuid,
  xp integer not null check (xp > 0),
  -- Dia do usuário (fuso do perfil) em que o XP foi concedido; base do limite diário.
  awarded_on date not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (profile_id, idempotency_key)
);
create index xp_events_profile_day_idx on public.xp_events (profile_id, awarded_on, source);
create index xp_events_profile_created_idx on public.xp_events (profile_id, created_at desc);

-- Totais derivados do livro-razão (recalculáveis).
create table public.user_stats (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  total_xp bigint not null default 0 check (total_xp >= 0),
  level integer not null default 1,
  -- Último nível cuja comemoração o usuário já viu.
  celebrated_level integer not null default 1,
  updated_at timestamptz not null default now()
);

insert into public.user_stats (profile_id) select id from public.profiles on conflict do nothing;

-- Concede XP. Só roda dentro de gatilhos (sem permissão de execução para usuários).
create function public.award_xp(p_profile uuid, p_source text, p_ref uuid, p_key text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  tz text;
  today date;
  inserted integer;
  new_total bigint;
  new_level integer;
begin
  select xp, daily_cap into r from public.xp_rules where source = p_source and enabled;
  if not found then return 0; end if;

  select timezone into tz from public.profiles where id = p_profile;
  today := (now() at time zone coalesce(tz, 'America/Sao_Paulo'))::date;

  if r.daily_cap is not null and (
    select count(*) from public.xp_events
    where profile_id = p_profile and source = p_source and awarded_on = today
  ) >= r.daily_cap then
    return 0;
  end if;

  insert into public.xp_events (profile_id, source, ref_id, xp, awarded_on, idempotency_key)
  values (p_profile, p_source, p_ref, r.xp, today, p_key)
  on conflict (profile_id, idempotency_key) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 0; end if;

  insert into public.user_stats (profile_id, total_xp) values (p_profile, r.xp)
  on conflict (profile_id) do update
    set total_xp = public.user_stats.total_xp + excluded.total_xp, updated_at = now()
  returning total_xp into new_total;

  select coalesce(max(level), 1) into new_level from public.levels where min_xp <= new_total;
  update public.user_stats set level = new_level where profile_id = p_profile;
  return r.xp;
end;
$$;

-- Lançamento criado: 10 XP, exceto se for idêntico a outro já existente (anti-farm).
create function public.xp_on_transaction() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.transactions t
    where t.profile_id = new.profile_id and t.id <> new.id
      and t.kind = new.kind and t.amount_cents = new.amount_cents
      and t.occurred_on = new.occurred_on
      and t.account_id is not distinct from new.account_id
      and t.to_account_id is not distinct from new.to_account_id
      and t.category_id is not distinct from new.category_id
      and t.holding_id is not distinct from new.holding_id
  ) then
    return null;
  end if;
  perform public.award_xp(new.profile_id, 'transaction_created', new.id, 'tx:' || new.id);
  return null;
end;
$$;
create trigger transactions_xp after insert on public.transactions
  for each row execute function public.xp_on_transaction();

-- Meta criada e meta concluída (cada uma rende XP uma única vez por meta).
create function public.xp_on_goal() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.award_xp(new.profile_id, 'goal_created', new.id, 'goal_created:' || new.id);
  elsif new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.award_xp(new.profile_id, 'goal_completed', new.id, 'goal_completed:' || new.id);
  end if;
  return null;
end;
$$;
create trigger goals_xp after insert or update on public.goals
  for each row execute function public.xp_on_goal();

-- Contribuição positiva em uma meta.
create function public.xp_on_contribution() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.amount_cents > 0 then
    perform public.award_xp(new.profile_id, 'goal_contribution', new.id, 'contribution:' || new.id);
  end if;
  return null;
end;
$$;
create trigger goal_contributions_xp after insert on public.goal_contributions
  for each row execute function public.xp_on_contribution();

-- Quem faz o ack da comemoração de nível é o próprio usuário.
create function public.acknowledge_level() returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_stats set celebrated_level = level where profile_id = (select auth.uid());
$$;

-- Nenhuma função de XP pode ser chamada diretamente pelos usuários (exceto o ack).
revoke execute on function public.award_xp(uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.xp_on_transaction() from public, anon, authenticated;
revoke execute on function public.xp_on_goal() from public, anon, authenticated;
revoke execute on function public.xp_on_contribution() from public, anon, authenticated;
revoke execute on function public.acknowledge_level() from public, anon;
grant execute on function public.acknowledge_level() to authenticated;

-- RLS: leitura apenas dos próprios dados; escrita só pelos gatilhos.
alter table public.xp_rules enable row level security;
alter table public.levels enable row level security;
alter table public.xp_events enable row level security;
alter table public.user_stats enable row level security;

create policy xp_rules_read on public.xp_rules for select to authenticated using (true);
create policy levels_read on public.levels for select to authenticated using (true);
create policy xp_events_select_own on public.xp_events
  for select to authenticated using (profile_id = (select auth.uid()));
create policy user_stats_select_own on public.user_stats
  for select to authenticated using (profile_id = (select auth.uid()));

revoke all on public.xp_rules, public.levels, public.xp_events, public.user_stats
  from anon, authenticated;
grant select on public.xp_rules, public.levels, public.xp_events, public.user_stats to authenticated;

-- Novos usuários já nascem com a linha de estatísticas.
create or replace function public.handle_new_user() returns trigger
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
  insert into public.user_stats (profile_id) values (new.id);
  perform public.seed_default_data(new.id);

  if terms_version is not null then
    insert into public.consents (profile_id, type, version)
    values (new.id, 'terms', terms_version), (new.id, 'privacy', terms_version);
  end if;
  return new;
end;
$$;
