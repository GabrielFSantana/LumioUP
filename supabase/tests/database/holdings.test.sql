-- Testes de posições de investimento (Etapa 6). Executar com: npx supabase test db
begin;
select plan(18);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}');

create temp table ids as
select
  (select id from public.accounts where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and name = 'Carteira') as a_wallet,
  (select id from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'investment' and name = 'Renda fixa') as a_inv,
  (select id from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'investment' and name = 'Ações') as a_inv2,
  (select id from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'expense' and name = 'Moradia') as a_exp,
  (select id from public.categories where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and kind = 'investment' and name = 'Renda fixa') as b_inv;
grant select on ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- Posições
select lives_ok($$ insert into public.holdings (id, profile_id, name, category_id)
  select 'aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Tesouro Selic', a_inv from ids $$, 'posição válida');
select throws_ok($$ insert into public.holdings (profile_id, name, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', '  tesouro selic ', a_inv from ids $$, '23505', null, 'nome repetido é rejeitado');
select throws_ok($$ insert into public.holdings (profile_id, name, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'Algo', a_exp from ids $$, 'P0001', 'category_kind_mismatch', 'categoria de gasto não serve');
select throws_ok($$ insert into public.holdings (profile_id, name, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'Outra', b_inv from ids $$, 'P0001', 'invalid_category', 'categoria de outro usuário é rejeitada');
select throws_ok($$ update public.holdings set category_id = (select a_inv2 from ids) $$, 'P0001', 'holding_category_immutable', 'categoria da posição não muda');
select throws_ok($$ delete from public.holdings $$, '42501', null, 'posições não são apagadas');

-- Movimentos
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, holding_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'investment', 100000, current_date, a_wallet, 'aaaaaaaa-2222-0000-0000-000000000001' from ids $$, 'aporte válido');
select is((select category_id from public.transactions where kind = 'investment'), (select a_inv from ids), 'categoria do aporte vem da posição');
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, holding_id)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'profit', 2500, current_date, 'aaaaaaaa-2222-0000-0000-000000000001') $$, 'lucro sem conta é aceito');
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, holding_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'redemption', 50000, current_date, a_wallet, 'aaaaaaaa-2222-0000-0000-000000000001' from ids $$, 'resgate válido');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, holding_id)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'investment', 100, current_date, 'aaaaaaaa-2222-0000-0000-000000000001') $$, '23514', null, 'aporte exige conta');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'investment', 100, current_date, a_wallet from ids $$, 'P0001', 'holding_required', 'aporte exige posição');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id, holding_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 100, current_date, a_wallet, a_exp, 'aaaaaaaa-2222-0000-0000-000000000001' from ids $$, '23514', null, 'gasto não pode ter posição');
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, holding_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'investment', 100, current_date, a_wallet, 'bbbbbbbb-2222-0000-0000-000000000001' from ids $$, 'P0001', 'invalid_holding', 'posição inexistente ou de outro usuário');

select is((select count(*)::int from public.transactions where holding_id is not null), 3, 'A vê os 3 movimentos');

-- Posição arquivada não recebe movimentos novos
update public.holdings set is_archived = true where id = 'aaaaaaaa-2222-0000-0000-000000000001';
select throws_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, holding_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'investment', 100, current_date, a_wallet, 'aaaaaaaa-2222-0000-0000-000000000001' from ids $$, 'P0001', 'holding_archived', 'posição arquivada não recebe aportes');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.holdings), 0, 'B não enxerga posições de A');
select is_empty($$ update public.holdings set name = 'Hack' returning 1 $$, 'B não altera posições de A');

select * from finish();
rollback;
