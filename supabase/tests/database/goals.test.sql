-- Testes de metas e contribuições (Etapa 9). Executar com: npx supabase test db
begin;
select plan(23);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}');

create temp table ids as
select
  (select id from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'expense' and name = 'Lazer') as a_exp,
  (select id from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'income' and name = 'Salário') as a_inc;
grant select on ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- Criação de metas
select lives_ok($$ insert into public.goals (id, profile_id, name, kind, target_cents, deadline)
  values ('aaaaaaaa-3333-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Viagem', 'trip', 100000, current_date + 90) $$, 'meta acumulativa válida');
select throws_ok($$ insert into public.goals (profile_id, name, kind, target_cents)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Zero', 'save', 0) $$, '23514', null, 'valor-alvo zero é rejeitado');
select throws_ok($$ insert into public.goals (profile_id, name, kind, target_cents, deadline)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Passado', 'save', 1000, current_date - 1) $$, 'P0001', 'invalid_deadline', 'prazo no passado é rejeitado');
select throws_ok($$ insert into public.goals (profile_id, name, kind, target_cents)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Limite', 'spending_limit', 50000) $$, '23514', null, 'limite de gastos exige categoria');
select throws_ok($$ insert into public.goals (profile_id, name, kind, target_cents, expense_category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'Limite', 'spending_limit', 50000, a_inc from ids $$, 'P0001', 'category_kind_mismatch', 'categoria de receita não serve para limite');
select throws_ok($$ insert into public.goals (profile_id, name, kind, target_cents, expense_category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'Viagem 2', 'trip', 50000, a_exp from ids $$, '23514', null, 'meta acumulativa não tem categoria de gasto');
select lives_ok($$ insert into public.goals (id, profile_id, name, kind, target_cents, expense_category_id)
  select 'aaaaaaaa-3333-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Lazer até 500', 'spending_limit', 50000, a_exp from ids $$, 'limite mensal de gastos válido');
select throws_ok($$ insert into public.goals (profile_id, name, kind, target_cents, deadline)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Invest', 'invest_monthly', 50000, current_date + 30) $$, '23514', null, 'meta mensal não tem prazo');

-- Contribuições e status automático
select lives_ok($$ insert into public.goal_contributions (id, profile_id, goal_id, amount_cents, occurred_on)
  values ('aaaaaaaa-4444-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000001', 40000, current_date) $$, 'contribuição válida');
select is((select status from public.goals where id = 'aaaaaaaa-3333-0000-0000-000000000001'), 'active', 'abaixo do alvo continua ativa');
select lives_ok($$ insert into public.goal_contributions (profile_id, goal_id, amount_cents, occurred_on)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000001', 60000, current_date) $$, 'segunda contribuição');
select is((select status from public.goals where id = 'aaaaaaaa-3333-0000-0000-000000000001'), 'completed', 'ao atingir o alvo vira concluída');
select isnt((select completed_at from public.goals where id = 'aaaaaaaa-3333-0000-0000-000000000001'), null, 'data de conclusão registrada');
select lives_ok($$ insert into public.goal_contributions (profile_id, goal_id, amount_cents, occurred_on)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000001', -10000, current_date) $$, 'retirada válida');
select is((select status from public.goals where id = 'aaaaaaaa-3333-0000-0000-000000000001'), 'active', 'retirada abaixo do alvo reativa a meta');
select throws_ok($$ insert into public.goal_contributions (profile_id, goal_id, amount_cents, occurred_on)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000001', -90001, current_date) $$, 'P0001', 'negative_goal_balance', 'saldo da meta nunca fica negativo');
select lives_ok($$ update public.goal_contributions set deleted_at = now() where id = 'aaaaaaaa-4444-0000-0000-000000000001' $$, 'exclusão lógica de contribuição');
select throws_ok($$ insert into public.goal_contributions (profile_id, goal_id, amount_cents, occurred_on)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000002', 100, current_date) $$, 'P0001', 'goal_not_accumulative', 'limite mensal não recebe contribuições');

-- Regras de edição e acesso
select throws_ok($$ update public.goals set kind = 'save' where id = 'aaaaaaaa-3333-0000-0000-000000000001' $$, 'P0001', 'goal_kind_immutable', 'tipo da meta não muda');
select lives_ok($$ update public.goals set status = 'paused' where id = 'aaaaaaaa-3333-0000-0000-000000000001' $$, 'pausar meta');
select throws_ok($$ insert into public.goal_contributions (profile_id, goal_id, amount_cents, occurred_on)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000001', 100, current_date) $$, 'P0001', 'goal_not_active', 'meta pausada não recebe contribuições');
select throws_ok($$ delete from public.goals $$, '42501', null, 'metas não são apagadas');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.goals) + (select count(*)::int from public.goal_contributions), 0, 'B não enxerga metas nem contribuições de A');

select * from finish();
rollback;
