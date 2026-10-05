-- Etapa 11: sequência de dias, missões e conquistas.
-- Tudo concedido no servidor. Dia de atividade = dia em que a ação é FEITA (fuso do perfil),
-- não a data do lançamento: lançar datas antigas não estende a sequência.

-- ===== Regras de XP novas =====
alter table public.xp_rules add column variable boolean not null default false;

insert into public.xp_rules (source, xp, daily_cap, label, description, variable) values
  ('active_day', 5, 1, 'Dia organizado', 'Tenha atividade no app em um dia.', false),
  ('mission_completed', 1, null, 'Missão concluída', 'Cada missão tem o seu valor de XP.', true),
  ('achievement_unlocked', 1, null, 'Conquista desbloqueada', 'Cada conquista tem o seu valor de XP.', true);

-- ===== Sequência =====
alter table public.user_stats
  add column current_streak integer not null default 0 check (current_streak >= 0),
  add column best_streak integer not null default 0 check (best_streak >= 0),
  add column last_active_on date;

create table public.activity_days (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  primary key (profile_id, day)
);

-- ===== Missões =====
create table public.mission_templates (
  code text primary key,
  period text not null check (period in ('daily', 'weekly')),
  title text not null,
  description text not null,
  metric text not null check (metric in ('transactions_created', 'contributions_created', 'active_days')),
  target integer not null check (target > 0),
  xp_reward integer not null check (xp_reward between 1 and 200),
  enabled boolean not null default true,
  sort_order integer not null default 0
);

insert into public.mission_templates (code, period, title, description, metric, target, xp_reward, sort_order) values
  ('daily_log_2', 'daily', 'Registre 2 lançamentos', 'Anote dois lançamentos hoje.', 'transactions_created', 2, 15, 10),
  ('daily_goal', 'daily', 'Guarde para uma meta', 'Registre uma contribuição em uma meta hoje.', 'contributions_created', 1, 10, 20),
  ('weekly_5_days', 'weekly', 'Cinco dias organizados', 'Tenha atividade em 5 dias desta semana.', 'active_days', 5, 40, 30),
  ('weekly_log_10', 'weekly', 'Dez lançamentos na semana', 'Registre 10 lançamentos nesta semana.', 'transactions_created', 10, 30, 40);

create table public.user_missions (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  template_code text not null references public.mission_templates (code),
  -- Dia (missão diária) ou domingo da semana (missão semanal), no fuso do usuário.
  period_start date not null,
  progress integer not null default 0,
  completed_at timestamptz,
  primary key (profile_id, template_code, period_start)
);

-- ===== Conquistas =====
create table public.achievements (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null,
  color text not null check (color in ('coral', 'green', 'blue', 'teal', 'amber', 'pink', 'slate', 'sand')),
  metric text not null check (metric in (
    'transactions_total', 'investments_total', 'goals_created', 'goals_completed',
    'contributions_total', 'best_streak', 'level')),
  threshold integer not null check (threshold > 0),
  xp_reward integer not null check (xp_reward between 1 and 200),
  enabled boolean not null default true,
  sort_order integer not null default 0
);

insert into public.achievements (code, name, description, icon, color, metric, threshold, xp_reward, sort_order) values
  ('first_transaction', 'Primeiro passo', 'Registrou o primeiro lançamento.', 'footsteps-outline', 'teal', 'transactions_total', 1, 20, 10),
  ('ten_transactions', 'Pegando o ritmo', 'Registrou 10 lançamentos.', 'pulse-outline', 'blue', 'transactions_total', 10, 30, 20),
  ('fifty_transactions', 'Organização em dia', 'Registrou 50 lançamentos.', 'calendar-outline', 'green', 'transactions_total', 50, 60, 30),
  ('first_goal', 'Com um objetivo', 'Criou a primeira meta.', 'flag-outline', 'pink', 'goals_created', 1, 20, 40),
  ('first_contribution', 'Guardando', 'Fez a primeira contribuição em uma meta.', 'wallet-outline', 'amber', 'contributions_total', 1, 20, 50),
  ('goal_done', 'Meta cumprida', 'Concluiu uma meta.', 'trophy-outline', 'amber', 'goals_completed', 1, 50, 60),
  ('first_investment', 'Primeiro aporte', 'Registrou o primeiro aporte em uma posição.', 'trending-up-outline', 'blue', 'investments_total', 1, 20, 70),
  ('streak_3', 'Três dias seguidos', 'Teve atividade por 3 dias seguidos.', 'flame-outline', 'coral', 'best_streak', 3, 20, 80),
  ('streak_7', 'Semana organizada', 'Teve atividade por 7 dias seguidos.', 'flame-outline', 'coral', 'best_streak', 7, 50, 90),
  ('streak_30', 'Mês inteiro', 'Teve atividade por 30 dias seguidos.', 'flame-outline', 'coral', 'best_streak', 30, 150, 100),
  ('level_4', 'Planejador', 'Chegou ao nível 4.', 'ribbon-outline', 'slate', 'level', 4, 50, 110);

create table public.user_achievements (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  code text not null references public.achievements (code),
  unlocked_at timestamptz not null default now(),
  primary key (profile_id, code)
);

-- ===== Funções internas (só rodam dentro de gatilhos) =====

-- Substitui award_xp: agora aceita um valor explícito (só para regras "variable").
drop function public.award_xp(uuid, text, uuid, text);
create function public.award_xp(
  p_profile uuid, p_source text, p_ref uuid, p_key text, p_xp integer default null
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  amount integer;
  tz text;
  today date;
  inserted integer;
  new_total bigint;
  new_level integer;
begin
  select xp, daily_cap, variable into r from public.xp_rules where source = p_source and enabled;
  if not found then return 0; end if;
  if p_xp is not null and not r.variable then
    raise exception 'xp_override_not_allowed' using errcode = 'P0001';
  end if;
  amount := coalesce(p_xp, r.xp);
  if amount < 1 or amount > 200 then raise exception 'invalid_xp' using errcode = 'P0001'; end if;

  select timezone into tz from public.profiles where id = p_profile;
  today := (now() at time zone coalesce(tz, 'America/Sao_Paulo'))::date;

  if r.daily_cap is not null and (
    select count(*) from public.xp_events
    where profile_id = p_profile and source = p_source and awarded_on = today
  ) >= r.daily_cap then
    return 0;
  end if;

  insert into public.xp_events (profile_id, source, ref_id, xp, awarded_on, idempotency_key)
  values (p_profile, p_source, p_ref, amount, today, p_key)
  on conflict (profile_id, idempotency_key) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 0; end if;

  insert into public.user_stats (profile_id, total_xp) values (p_profile, amount)
  on conflict (profile_id) do update
    set total_xp = public.user_stats.total_xp + excluded.total_xp, updated_at = now()
  returning total_xp into new_total;

  select coalesce(max(level), 1) into new_level from public.levels where min_xp <= new_total;
  update public.user_stats set level = new_level where profile_id = p_profile;
  return amount;
end;
$$;

-- Dia de hoje do usuário (fuso do perfil).
create function public.local_today(p_profile uuid) returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select timezone from public.profiles where id = p_profile), 'America/Sao_Paulo'))::date;
$$;

-- Missões: soma progresso das missões da métrica e concede o XP ao concluir (uma vez por período).
create function public.bump_missions(p_profile uuid, p_metric text, p_n integer default 1)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
  today date := public.local_today(p_profile);
  week_start date := public.local_today(p_profile)
    - (extract(dow from public.local_today(p_profile)))::integer;
  ps date;
  prog integer;
  done timestamptz;
begin
  for t in select * from public.mission_templates where metric = p_metric and enabled loop
    ps := case t.period when 'daily' then today else week_start end;
    insert into public.user_missions (profile_id, template_code, period_start, progress)
    values (p_profile, t.code, ps, p_n)
    on conflict (profile_id, template_code, period_start)
      do update set progress = public.user_missions.progress + p_n
    returning progress, completed_at into prog, done;
    if done is null and prog >= t.target then
      update public.user_missions set completed_at = now()
        where profile_id = p_profile and template_code = t.code and period_start = ps;
      perform public.award_xp(p_profile, 'mission_completed', null,
        'mission:' || t.code || ':' || ps, t.xp_reward);
    end if;
  end loop;
end;
$$;

-- Marca o dia de hoje como ativo, atualiza a sequência e concede o XP do dia (uma vez por dia).
create function public.mark_active_day(p_profile uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := public.local_today(p_profile);
  inserted integer;
  s record;
  streak integer;
begin
  insert into public.activity_days (profile_id, day) values (p_profile, today)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;

  insert into public.user_stats (profile_id) values (p_profile) on conflict do nothing;
  select last_active_on, current_streak, best_streak into s
    from public.user_stats where profile_id = p_profile for update;

  if s.last_active_on is not null and today = s.last_active_on + 1 then
    streak := s.current_streak + 1;
  else
    streak := 1;
  end if;
  update public.user_stats
    set current_streak = streak,
        best_streak = greatest(s.best_streak, streak),
        last_active_on = today
    where profile_id = p_profile;

  perform public.award_xp(p_profile, 'active_day', null, 'active_day:' || today);
  perform public.bump_missions(p_profile, 'active_days', 1);
end;
$$;

-- Conquistas: desbloqueia as que atingiram o limite. Repete (até 3 vezes) porque o XP de uma
-- conquista pode subir o nível e liberar outra.
create function public.check_achievements(p_profile uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  v_tx bigint;
  v_inv bigint;
  v_goals bigint;
  v_done bigint;
  v_contrib bigint;
  v_best integer;
  v_level integer;
  val bigint;
  unlocked boolean;
begin
  for i in 1..3 loop
    unlocked := false;
    select count(*) into v_tx from public.transactions where profile_id = p_profile;
    select count(*) into v_inv from public.transactions
      where profile_id = p_profile and kind = 'investment';
    select count(*) into v_goals from public.goals where profile_id = p_profile;
    select count(*) into v_done from public.goals
      where profile_id = p_profile and completed_at is not null;
    select count(*) into v_contrib from public.goal_contributions
      where profile_id = p_profile and amount_cents > 0;
    select coalesce(best_streak, 0), coalesce(level, 1) into v_best, v_level
      from public.user_stats where profile_id = p_profile;

    for a in
      select * from public.achievements x
      where x.enabled and not exists (
        select 1 from public.user_achievements u where u.profile_id = p_profile and u.code = x.code)
    loop
      val := case a.metric
        when 'transactions_total' then v_tx
        when 'investments_total' then v_inv
        when 'goals_created' then v_goals
        when 'goals_completed' then v_done
        when 'contributions_total' then v_contrib
        when 'best_streak' then coalesce(v_best, 0)
        when 'level' then coalesce(v_level, 1)
      end;
      if val >= a.threshold then
        insert into public.user_achievements (profile_id, code) values (p_profile, a.code)
        on conflict do nothing;
        perform public.award_xp(p_profile, 'achievement_unlocked', null, 'achv:' || a.code, a.xp_reward);
        unlocked := true;
      end if;
    end loop;
    exit when not unlocked;
  end loop;
end;
$$;

-- ===== Gatilhos atualizados =====

-- Lançamento: o dia conta sempre; o XP e o progresso de missões só quando o lançamento rende XP.
create or replace function public.xp_on_transaction() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  duplicate boolean;
  awarded integer := 0;
begin
  perform public.mark_active_day(new.profile_id);

  select exists (
    select 1 from public.transactions t
    where t.profile_id = new.profile_id and t.id <> new.id
      and t.kind = new.kind and t.amount_cents = new.amount_cents
      and t.occurred_on = new.occurred_on
      and t.account_id is not distinct from new.account_id
      and t.to_account_id is not distinct from new.to_account_id
      and t.category_id is not distinct from new.category_id
      and t.holding_id is not distinct from new.holding_id
  ) into duplicate;

  if not duplicate then
    awarded := public.award_xp(new.profile_id, 'transaction_created', new.id, 'tx:' || new.id);
    if awarded > 0 then
      perform public.bump_missions(new.profile_id, 'transactions_created', 1);
    end if;
  end if;
  perform public.check_achievements(new.profile_id);
  return null;
end;
$$;

create or replace function public.xp_on_goal() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.mark_active_day(new.profile_id);
    perform public.award_xp(new.profile_id, 'goal_created', new.id, 'goal_created:' || new.id);
  elsif new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.award_xp(new.profile_id, 'goal_completed', new.id, 'goal_completed:' || new.id);
  end if;
  perform public.check_achievements(new.profile_id);
  return null;
end;
$$;

create or replace function public.xp_on_contribution() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  awarded integer := 0;
begin
  if new.amount_cents > 0 then
    perform public.mark_active_day(new.profile_id);
    awarded := public.award_xp(new.profile_id, 'goal_contribution', new.id, 'contribution:' || new.id);
    if awarded > 0 then
      perform public.bump_missions(new.profile_id, 'contributions_created', 1);
    end if;
    perform public.check_achievements(new.profile_id);
  end if;
  return null;
end;
$$;

-- ===== Permissões =====
revoke execute on function public.award_xp(uuid, text, uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.local_today(uuid) from public, anon, authenticated;
revoke execute on function public.bump_missions(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.mark_active_day(uuid) from public, anon, authenticated;
revoke execute on function public.check_achievements(uuid) from public, anon, authenticated;

alter table public.activity_days enable row level security;
alter table public.mission_templates enable row level security;
alter table public.user_missions enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

create policy activity_days_select_own on public.activity_days
  for select to authenticated using (profile_id = (select auth.uid()));
create policy mission_templates_read on public.mission_templates
  for select to authenticated using (true);
create policy user_missions_select_own on public.user_missions
  for select to authenticated using (profile_id = (select auth.uid()));
create policy achievements_read on public.achievements
  for select to authenticated using (true);
create policy user_achievements_select_own on public.user_achievements
  for select to authenticated using (profile_id = (select auth.uid()));

revoke all on public.activity_days, public.mission_templates, public.user_missions,
  public.achievements, public.user_achievements from anon, authenticated;
grant select on public.activity_days, public.mission_templates, public.user_missions,
  public.achievements, public.user_achievements to authenticated;
