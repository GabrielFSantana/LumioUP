-- Etapa 6: posições de investimento (holdings) e movimentos de investimento.
-- Valor atual de uma posição = aportes - resgates + lucros - perdas (calculado no core/app).
-- Lucro e perda não movem dinheiro das contas, por isso a conta é opcional nesses dois tipos.

create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  category_id uuid not null references public.categories (id),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index holdings_unique_name_idx on public.holdings (profile_id, lower(btrim(name)));
create index holdings_profile_idx on public.holdings (profile_id);

create trigger holdings_set_updated_at before update on public.holdings
  for each row execute function public.set_updated_at();

-- A categoria da posição é do próprio usuário, ativa e do tipo "investment"; não muda depois.
-- Limite de 100 posições por usuário.
create function public.validate_holding() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cat record;
begin
  if tg_op = 'UPDATE' then
    if new.category_id is distinct from old.category_id then
      raise exception 'holding_category_immutable' using errcode = 'P0001';
    end if;
    return new;
  end if;

  select kind, is_archived into cat from public.categories
    where id = new.category_id and profile_id = new.profile_id;
  if not found then raise exception 'invalid_category' using errcode = 'P0001'; end if;
  if cat.kind <> 'investment' then
    raise exception 'category_kind_mismatch' using errcode = 'P0001';
  end if;
  if cat.is_archived then raise exception 'category_archived' using errcode = 'P0001'; end if;

  if (select count(*) from public.holdings where profile_id = new.profile_id) >= 100 then
    raise exception 'holding_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger holdings_validate before insert or update on public.holdings
  for each row execute function public.validate_holding();

alter table public.holdings enable row level security;
create policy holdings_select_own on public.holdings
  for select to authenticated using (profile_id = (select auth.uid()));
create policy holdings_insert_own on public.holdings
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy holdings_update_own on public.holdings
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
revoke all on public.holdings from anon, authenticated;
grant select, insert, update on public.holdings to authenticated;
-- Sem delete: posições são arquivadas.

-- Lançamentos passam a apontar para a posição (obrigatório nos 4 tipos de investimento).
alter table public.transactions add column holding_id uuid references public.holdings (id);
create index transactions_holding_idx on public.transactions (holding_id) where deleted_at is null;

alter table public.transactions alter column account_id drop not null;

alter table public.transactions add constraint transactions_holding_check check (
  (kind in ('investment', 'redemption', 'profit', 'loss') and holding_id is not null)
  or (kind not in ('investment', 'redemption', 'profit', 'loss') and holding_id is null)
);
alter table public.transactions add constraint transactions_account_check check (
  account_id is not null or kind in ('profit', 'loss')
);

-- Validação atualizada: posição do próprio usuário (e ativa), categoria herdada da posição.
create or replace function public.validate_transaction() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  acc record;
  cat record;
  hold record;
  expected_kind text;
begin
  if new.occurred_on < date '2000-01-01' or new.occurred_on > current_date + 366 then
    raise exception 'invalid_date' using errcode = 'P0001';
  end if;

  if new.account_id is not null
     and (tg_op = 'INSERT' or new.account_id is distinct from old.account_id) then
    select is_archived into acc from public.accounts
      where id = new.account_id and profile_id = new.profile_id;
    if not found then raise exception 'invalid_account' using errcode = 'P0001'; end if;
    if acc.is_archived then raise exception 'account_archived' using errcode = 'P0001'; end if;
  end if;

  if new.to_account_id is not null
     and (tg_op = 'INSERT' or new.to_account_id is distinct from old.to_account_id) then
    select is_archived into acc from public.accounts
      where id = new.to_account_id and profile_id = new.profile_id;
    if not found then raise exception 'invalid_account' using errcode = 'P0001'; end if;
    if acc.is_archived then raise exception 'account_archived' using errcode = 'P0001'; end if;
  end if;

  if new.kind in ('investment', 'redemption', 'profit', 'loss') then
    if new.holding_id is null then raise exception 'holding_required' using errcode = 'P0001'; end if;
    select category_id, is_archived into hold from public.holdings
      where id = new.holding_id and profile_id = new.profile_id;
    if not found then raise exception 'invalid_holding' using errcode = 'P0001'; end if;
    if hold.is_archived and (tg_op = 'INSERT' or new.holding_id is distinct from old.holding_id) then
      raise exception 'holding_archived' using errcode = 'P0001';
    end if;
    -- A categoria do movimento é sempre a da posição.
    new.category_id := hold.category_id;
  elsif new.kind <> 'transfer' and new.category_id is not null
     and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id) then
    select kind, is_archived into cat from public.categories
      where id = new.category_id and profile_id = new.profile_id;
    if not found then raise exception 'invalid_category' using errcode = 'P0001'; end if;
    if cat.is_archived then raise exception 'category_archived' using errcode = 'P0001'; end if;
    expected_kind := case new.kind when 'expense' then 'expense' else 'income' end;
    if cat.kind <> expected_kind then
      raise exception 'category_kind_mismatch' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;
