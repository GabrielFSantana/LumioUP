-- Etapa 9: metas e contribuições.
-- Metas acumulativas (emergency, save, debt, trip, purchase): valor atual = soma das contribuições.
-- Metas mensais (invest_monthly, spending_limit): progresso vem dos lançamentos do mês (calculado no app).
-- Contribuições NÃO movem dinheiro entre contas: são marcações do quanto já foi separado.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  kind text not null check (kind in
    ('emergency', 'save', 'debt', 'trip', 'purchase', 'invest_monthly', 'spending_limit')),
  target_cents bigint not null check (target_cents between 1 and 99999999999),
  deadline date,
  -- Só para limite mensal de gastos: categoria de gasto controlada.
  expense_category_id uuid references public.categories (id),
  status text not null default 'active'
    check (status in ('active', 'completed', 'paused', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_category_check check (
    (kind = 'spending_limit' and expense_category_id is not null)
    or (kind <> 'spending_limit' and expense_category_id is null)
  ),
  -- Metas mensais não têm prazo nem "concluem": renovam todo mês.
  constraint goals_monthly_shape_check check (
    kind not in ('invest_monthly', 'spending_limit')
    or (deadline is null and status in ('active', 'paused', 'cancelled'))
  )
);
create index goals_profile_idx on public.goals (profile_id, status);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  goal_id uuid not null references public.goals (id),
  -- Positivo = guardar; negativo = retirar.
  amount_cents bigint not null
    check (amount_cents <> 0 and abs(amount_cents) <= 99999999999),
  occurred_on date not null,
  note text check (note is null or char_length(note) <= 200),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goal_contributions_goal_idx
  on public.goal_contributions (goal_id, occurred_on desc) where deleted_at is null;

create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();
create trigger goal_contributions_set_updated_at before update on public.goal_contributions
  for each row execute function public.set_updated_at();

-- Regras da meta: categoria válida, imutabilidade de tipo/categoria, limites e status automático.
create function public.goals_before() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cat record;
  total bigint;
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.goals where profile_id = new.profile_id) >= 100 then
      raise exception 'goal_limit_reached' using errcode = 'P0001';
    end if;
    if new.deadline is not null and new.deadline < current_date then
      raise exception 'invalid_deadline' using errcode = 'P0001';
    end if;
    new.status := 'active';
    new.completed_at := null;
    if new.expense_category_id is not null then
      select kind, is_archived into cat from public.categories
        where id = new.expense_category_id and profile_id = new.profile_id;
      if not found then raise exception 'invalid_category' using errcode = 'P0001'; end if;
      if cat.kind <> 'expense' then
        raise exception 'category_kind_mismatch' using errcode = 'P0001';
      end if;
      if cat.is_archived then raise exception 'category_archived' using errcode = 'P0001'; end if;
    end if;
    return new;
  end if;

  if new.kind <> old.kind then
    raise exception 'goal_kind_immutable' using errcode = 'P0001';
  end if;
  if new.expense_category_id is distinct from old.expense_category_id then
    raise exception 'goal_category_immutable' using errcode = 'P0001';
  end if;
  if new.deadline is not null and new.deadline is distinct from old.deadline
     and new.deadline < current_date then
    raise exception 'invalid_deadline' using errcode = 'P0001';
  end if;

  -- Meta acumulativa ativa ou concluída: o status acompanha a soma das contribuições.
  if new.kind not in ('invest_monthly', 'spending_limit') and new.status in ('active', 'completed') then
    select coalesce(sum(amount_cents), 0) into total from public.goal_contributions
      where goal_id = new.id and deleted_at is null;
    if total >= new.target_cents then
      new.status := 'completed';
      new.completed_at := coalesce(old.completed_at, now());
    else
      new.status := 'active';
      new.completed_at := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger goals_before before insert or update on public.goals
  for each row execute function public.goals_before();

-- Contribuição: só em meta acumulativa do próprio usuário, ativa ou concluída.
create function public.goal_contributions_before() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  g record;
begin
  if new.occurred_on < date '2000-01-01' or new.occurred_on > current_date + 366 then
    raise exception 'invalid_date' using errcode = 'P0001';
  end if;
  select kind, status into g from public.goals
    where id = new.goal_id and profile_id = new.profile_id;
  if not found then raise exception 'invalid_goal' using errcode = 'P0001'; end if;
  if tg_op = 'UPDATE' and new.goal_id is distinct from old.goal_id then
    raise exception 'goal_immutable' using errcode = 'P0001';
  end if;
  if g.kind in ('invest_monthly', 'spending_limit') then
    raise exception 'goal_not_accumulative' using errcode = 'P0001';
  end if;
  -- Restaurar/editar contribuições antigas não depende do status; registrar novas, sim.
  if tg_op = 'INSERT' and g.status not in ('active', 'completed') then
    raise exception 'goal_not_active' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger goal_contributions_before before insert or update on public.goal_contributions
  for each row execute function public.goal_contributions_before();

-- Depois de cada mudança: o saldo da meta nunca fica negativo e o status é reavaliado.
create function public.goal_contributions_after() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total bigint;
begin
  select coalesce(sum(amount_cents), 0) into total from public.goal_contributions
    where goal_id = new.goal_id and deleted_at is null;
  if total < 0 then
    raise exception 'negative_goal_balance' using errcode = 'P0001';
  end if;
  -- Dispara goals_before, que recalcula o status.
  update public.goals set updated_at = now() where id = new.goal_id;
  return null;
end;
$$;
create trigger goal_contributions_after after insert or update on public.goal_contributions
  for each row execute function public.goal_contributions_after();

alter table public.goals enable row level security;
alter table public.goal_contributions enable row level security;

create policy goals_select_own on public.goals
  for select to authenticated using (profile_id = (select auth.uid()));
create policy goals_insert_own on public.goals
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy goals_update_own on public.goals
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy goal_contributions_select_own on public.goal_contributions
  for select to authenticated using (profile_id = (select auth.uid()));
create policy goal_contributions_insert_own on public.goal_contributions
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy goal_contributions_update_own on public.goal_contributions
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

revoke all on public.goals, public.goal_contributions from anon, authenticated;
grant select, insert, update on public.goals to authenticated;
grant select, insert, update on public.goal_contributions to authenticated;
-- Sem delete: metas são canceladas e contribuições têm exclusão lógica.
