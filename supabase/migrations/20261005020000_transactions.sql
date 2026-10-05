-- Etapa 5: lançamentos financeiros.
-- Valor sempre positivo, em centavos; o sinal vem do tipo (mesma convenção do packages/core).
-- Exclusão é lógica (deleted_at) para permitir "Desfazer"; não há DELETE para o usuário.

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null
    check (kind in ('income', 'expense', 'investment', 'redemption', 'profit', 'loss', 'transfer')),
  amount_cents bigint not null check (amount_cents between 1 and 99999999999),
  occurred_on date not null,
  account_id uuid not null references public.accounts (id),
  to_account_id uuid references public.accounts (id),
  category_id uuid references public.categories (id),
  description text check (description is null or char_length(description) <= 120),
  notes text check (notes is null or char_length(notes) <= 500),
  payment_method text
    check (payment_method is null or payment_method in ('cash', 'pix', 'debit', 'credit', 'transfer', 'other')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Transferência: origem e destino distintos e sem categoria.
  -- Demais tipos: sem destino e com categoria.
  constraint transactions_shape_check check (
    (kind = 'transfer' and to_account_id is not null and to_account_id <> account_id
       and category_id is null)
    or (kind <> 'transfer' and to_account_id is null and category_id is not null)
  )
);

create index transactions_profile_date_idx
  on public.transactions (profile_id, occurred_on desc) where deleted_at is null;
create index transactions_profile_kind_date_idx
  on public.transactions (profile_id, kind, occurred_on) where deleted_at is null;
create index transactions_profile_category_date_idx
  on public.transactions (profile_id, category_id, occurred_on) where deleted_at is null;

create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

-- Regras que cruzam tabelas: contas e categoria do próprio usuário, ativas e do tipo certo.
-- Roda como o usuário (RLS aplica), então só enxerga as próprias linhas.
create function public.validate_transaction() returns trigger
language plpgsql
set search_path = ''
as $$
declare
  acc record;
  cat record;
  expected_kind text;
begin
  if new.occurred_on < date '2000-01-01' or new.occurred_on > current_date + 366 then
    raise exception 'invalid_date' using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' or new.account_id is distinct from old.account_id then
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

  -- Transferência com categoria é barrada pela constraint transactions_shape_check.
  if new.kind <> 'transfer' and new.category_id is not null
     and (tg_op = 'INSERT' or new.category_id is distinct from old.category_id) then
    select kind, is_archived into cat from public.categories
      where id = new.category_id and profile_id = new.profile_id;
    if not found then raise exception 'invalid_category' using errcode = 'P0001'; end if;
    if cat.is_archived then raise exception 'category_archived' using errcode = 'P0001'; end if;
    expected_kind := case new.kind
      when 'expense' then 'expense'
      when 'income' then 'income'
      else 'investment'
    end;
    if cat.kind <> expected_kind then
      raise exception 'category_kind_mismatch' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger transactions_validate before insert or update on public.transactions
  for each row execute function public.validate_transaction();

alter table public.transactions enable row level security;

create policy transactions_select_own on public.transactions
  for select to authenticated using (profile_id = (select auth.uid()));
create policy transactions_insert_own on public.transactions
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy transactions_update_own on public.transactions
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

revoke all on public.transactions from anon, authenticated;
grant select, insert, update on public.transactions to authenticated;
