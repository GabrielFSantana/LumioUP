-- Etapa 4: categorias e contas, com padrões copiados para cada usuário no cadastro.
-- Regras: nada é apagado (só arquivado) para preservar o histórico de lançamentos;
-- cada usuário só enxerga e altera as próprias linhas.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('expense', 'income', 'investment')),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  icon text not null default 'pricetag-outline' check (char_length(icon) between 1 and 40),
  color text not null default 'slate'
    check (color in ('coral', 'green', 'blue', 'teal', 'amber', 'pink', 'slate', 'sand')),
  is_archived boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index categories_unique_name_idx
  on public.categories (profile_id, kind, lower(btrim(name)));
create index categories_profile_kind_idx on public.categories (profile_id, kind, sort_order);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  kind text not null default 'wallet'
    check (kind in ('wallet', 'checking', 'savings', 'investment', 'other')),
  opening_balance_cents bigint not null default 0
    check (opening_balance_cents between 0 and 99999999999),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index accounts_unique_name_idx on public.accounts (profile_id, lower(btrim(name)));
create index accounts_profile_idx on public.accounts (profile_id);

create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger accounts_set_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();

-- Limites por usuário (evita abuso) e imutabilidade do tipo da categoria.
create function public.enforce_catalog_limits() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'categories' then
    if tg_op = 'UPDATE' then
      if new.kind <> old.kind then
        raise exception 'category_kind_immutable' using errcode = 'P0001';
      end if;
      return new;
    end if;
    if (select count(*) from public.categories where profile_id = new.profile_id) >= 200 then
      raise exception 'category_limit_reached' using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'accounts' then
    if (select count(*) from public.accounts where profile_id = new.profile_id) >= 20 then
      raise exception 'account_limit_reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger categories_limits before insert or update on public.categories
  for each row execute function public.enforce_catalog_limits();
create trigger accounts_limits before insert on public.accounts
  for each row execute function public.enforce_catalog_limits();

-- RLS
alter table public.categories enable row level security;
alter table public.accounts enable row level security;

create policy categories_select_own on public.categories
  for select to authenticated using (profile_id = (select auth.uid()));
create policy categories_insert_own on public.categories
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy categories_update_own on public.categories
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy accounts_select_own on public.accounts
  for select to authenticated using (profile_id = (select auth.uid()));
create policy accounts_insert_own on public.accounts
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy accounts_update_own on public.accounts
  for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

revoke all on public.categories, public.accounts from anon, authenticated;
grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.accounts to authenticated;
-- Sem delete: categorias e contas são arquivadas, nunca apagadas.

-- Padrões copiados para cada usuário. Idempotente (reexecutar não duplica).
create function public.seed_default_data(p_profile uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.categories (profile_id, kind, name, icon, color, sort_order)
  select p_profile, d.kind, d.name, d.icon, d.color, d.ord
  from (values
    ('expense', 'Moradia', 'home-outline', 'blue', 1),
    ('expense', 'Alimentação', 'restaurant-outline', 'coral', 2),
    ('expense', 'Transporte', 'car-outline', 'teal', 3),
    ('expense', 'Saúde', 'medkit-outline', 'green', 4),
    ('expense', 'Educação', 'school-outline', 'amber', 5),
    ('expense', 'Lazer', 'game-controller-outline', 'pink', 6),
    ('expense', 'Assinaturas', 'repeat-outline', 'slate', 7),
    ('expense', 'Compras', 'bag-handle-outline', 'pink', 8),
    ('expense', 'Impostos', 'receipt-outline', 'sand', 9),
    ('expense', 'Dívidas', 'card-outline', 'slate', 10),
    ('expense', 'Outros', 'ellipsis-horizontal-outline', 'sand', 11),
    ('income', 'Salário', 'cash-outline', 'green', 1),
    ('income', 'Renda extra', 'add-circle-outline', 'teal', 2),
    ('income', 'Freelance', 'laptop-outline', 'blue', 3),
    ('income', 'Dividendos', 'trending-up-outline', 'amber', 4),
    ('income', 'Juros', 'stats-chart-outline', 'teal', 5),
    ('income', 'Aluguéis', 'business-outline', 'blue', 6),
    ('income', 'Venda de ativos', 'swap-horizontal-outline', 'slate', 7),
    ('income', 'Outros', 'ellipsis-horizontal-outline', 'sand', 8),
    ('investment', 'Reserva de emergência', 'shield-checkmark-outline', 'green', 1),
    ('investment', 'Renda fixa', 'lock-closed-outline', 'blue', 2),
    ('investment', 'Fundos', 'pie-chart-outline', 'teal', 3),
    ('investment', 'Ações', 'trending-up-outline', 'amber', 4),
    ('investment', 'Criptomoedas', 'logo-bitcoin', 'coral', 5),
    ('investment', 'Previdência', 'umbrella-outline', 'slate', 6),
    ('investment', 'Outros', 'ellipsis-horizontal-outline', 'sand', 7)
  ) as d (kind, name, icon, color, ord)
  on conflict do nothing;

  insert into public.accounts (profile_id, name, kind)
  values (p_profile, 'Carteira', 'wallet')
  on conflict do nothing;
end;
$$;
revoke execute on function public.seed_default_data(uuid) from public, anon, authenticated;

-- O cadastro passa a semear categorias e conta padrão.
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
  perform public.seed_default_data(new.id);

  if terms_version is not null then
    insert into public.consents (profile_id, type, version)
    values (new.id, 'terms', terms_version), (new.id, 'privacy', terms_version);
  end if;
  return new;
end;
$$;

-- Usuários já existentes recebem os padrões.
select public.seed_default_data(id) from public.profiles;
