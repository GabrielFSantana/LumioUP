-- Testes de categorias e contas (Etapa 4). Executar com: npx supabase test db
begin;
select plan(16);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}');

-- Seed no cadastro
select is((select count(*)::int from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'expense'), 11, '11 categorias de gasto padrão');
select is((select count(*)::int from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'income'), 8, '8 categorias de receita padrão');
select is((select count(*)::int from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'investment'), 7, '7 categorias de investimento padrão');
select is((select name from public.accounts where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'Carteira', 'conta Carteira criada');
select lives_ok($$ select public.seed_default_data('aaaaaaaa-0000-0000-0000-000000000001') $$, 'seed é idempotente');
select is((select count(*)::int from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 26, 'seed repetido não duplica');

-- Como usuário A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is((select count(*)::int from public.categories), 26, 'A vê só as próprias categorias');
select is((select count(*)::int from public.accounts), 1, 'A vê só as próprias contas');
select is_empty($$ update public.categories set name = 'Hack' where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' returning 1 $$, 'A não altera categoria de B');
select throws_ok($$ insert into public.categories (profile_id, kind, name) values ('bbbbbbbb-0000-0000-0000-000000000002', 'expense', 'Intrusa') $$, '42501', null, 'A não cria categoria para B');
select throws_ok($$ delete from public.categories $$, '42501', null, 'categorias não podem ser apagadas');
select throws_ok($$ delete from public.accounts $$, '42501', null, 'contas não podem ser apagadas');
select throws_ok($$ insert into public.categories (profile_id, kind, name) values ('aaaaaaaa-0000-0000-0000-000000000001', 'expense', '  moradia ') $$, '23505', null, 'nome repetido (ignorando caixa e espaços) é rejeitado');
select throws_ok($$ update public.categories set kind = 'income' where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and name = 'Moradia' $$, 'P0001', 'category_kind_immutable', 'tipo da categoria não muda');
select throws_ok($$ insert into public.accounts (profile_id, name, opening_balance_cents) values ('aaaaaaaa-0000-0000-0000-000000000001', 'Negativa', -1) $$, '23514', null, 'saldo inicial negativo é rejeitado');
select throws_ok($$ select public.seed_default_data('bbbbbbbb-0000-0000-0000-000000000002') $$, '42501', null, 'usuário não executa o seed');

select * from finish();
rollback;
