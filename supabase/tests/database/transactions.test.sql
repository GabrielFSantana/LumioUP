-- Testes de lançamentos (Etapa 5). Executar com: npx supabase test db
begin;
select plan(18);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}');

-- Ids de apoio, criados pelo seed do cadastro
create temp table ids as
select
  (select id from public.accounts where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and name = 'Carteira') as a_wallet,
  (select id from public.accounts where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and name = 'Carteira') as b_wallet,
  (select id from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'expense' and name = 'Moradia') as a_exp,
  (select id from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'income' and name = 'Salário') as a_inc,
  (select id from public.categories where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and kind = 'expense' and name = 'Moradia') as b_exp;
grant select on ids to authenticated;

insert into public.accounts (id, profile_id, name, kind)
  values ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Banco', 'checking');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 4890, current_date, a_wallet, a_exp from ids $$, 'despesa válida');
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'income', 500000, current_date, a_wallet, a_inc from ids $$, 'receita válida');
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, to_account_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'transfer', 1000, current_date, a_wallet, 'aaaaaaaa-1111-0000-0000-000000000001' from ids $$, 'transferência válida');

select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 0, current_date, a_wallet, a_exp from ids $$, '23514', null, 'valor zero é rejeitado');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', -5, current_date, a_wallet, a_exp from ids $$, '23514', null, 'valor negativo é rejeitado');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 100, current_date, a_wallet from ids $$, '23514', null, 'despesa exige categoria');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, to_account_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'transfer', 100, current_date, a_wallet, a_wallet from ids $$, '23514', null, 'transferência para a mesma conta é rejeitada');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, to_account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'transfer', 100, current_date, a_wallet, 'aaaaaaaa-1111-0000-0000-000000000001', a_exp from ids $$, '23514', null, 'transferência não tem categoria');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'income', 100, current_date, a_wallet, a_exp from ids $$, 'P0001', 'category_kind_mismatch', 'receita com categoria de gasto é rejeitada');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 100, current_date, b_wallet, a_exp from ids $$, 'P0001', 'invalid_account', 'conta de outro usuário é rejeitada');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 100, current_date, a_wallet, b_exp from ids $$, 'P0001', 'invalid_category', 'categoria de outro usuário é rejeitada');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 100, current_date + 400, a_wallet, a_exp from ids $$, 'P0001', 'invalid_date', 'data muito no futuro é rejeitada');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'bbbbbbbb-0000-0000-0000-000000000002', 'expense', 100, current_date, b_wallet, b_exp from ids $$, 'P0001', 'invalid_account', 'A não cria lançamento em nome de B');

select is((select count(*)::int from public.transactions), 3, 'A vê só os próprios lançamentos');
select lives_ok($$ update public.transactions set deleted_at = now() where kind = 'income' $$, 'exclusão lógica funciona');
select throws_ok($$ delete from public.transactions $$, '42501', null, 'lançamentos não podem ser apagados de verdade');

-- Conta arquivada não recebe lançamentos novos
update public.accounts set is_archived = true where id = 'aaaaaaaa-1111-0000-0000-000000000001';
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 100, current_date, 'aaaaaaaa-1111-0000-0000-000000000001', a_exp from ids $$, 'P0001', 'account_archived', 'conta arquivada não recebe lançamentos');

-- Como B
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.transactions), 0, 'B não enxerga lançamentos de A');

select * from finish();
rollback;
