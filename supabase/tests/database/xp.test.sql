-- Testes de XP, níveis e proteção contra abuso (Etapa 10). Executar com: npx supabase test db
begin;
select plan(32);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}');

create temp table ids as
select
  (select id from public.accounts where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and name = 'Carteira') as a_wallet,
  (select id from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'expense' and name = 'Lazer') as a_exp,
  (select id from public.accounts where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and name = 'Carteira') as b_wallet,
  (select id from public.categories where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and kind = 'expense' and name = 'Lazer') as b_exp;
grant select on ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- Lançamentos
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 1000, current_date, a_wallet, a_exp from ids $$, 'lançamento válido');
select is((select total_xp from public.user_stats), 10::bigint, 'lançamento rende 10 XP');
select is((select count(*)::int from public.xp_events), 1, 'um evento no livro-razão');
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 1000, current_date, a_wallet, a_exp from ids $$, 'lançamento idêntico é aceito');
select is((select total_xp from public.user_stats), 10::bigint, 'lançamento idêntico não rende XP');
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 1000 + n * 100, current_date, a_wallet, a_exp
  from ids, generate_series(1, 5) as n $$, 'cinco lançamentos diferentes');
select is((select total_xp from public.user_stats), 50::bigint, 'limite diário: no máximo 5 lançamentos rendem XP');
select is((select count(*)::int from public.xp_events where source = 'transaction_created'), 5, 'cinco eventos de lançamento');

-- Metas: criar, contribuir, concluir
select lives_ok($$ insert into public.goals (id, profile_id, name, kind, target_cents)
  values ('aaaaaaaa-3333-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Viagem', 'trip', 100000) $$, 'meta criada');
select is((select total_xp from public.user_stats), 70::bigint, 'meta criada rende 20 XP');
select lives_ok($$ insert into public.goal_contributions (profile_id, goal_id, amount_cents, occurred_on)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000001', 100000, current_date) $$, 'contribuição que conclui a meta');
select is((select total_xp from public.user_stats), 125::bigint, 'contribuição (5) mais meta concluída (50)');
select is((select level from public.user_stats), 2, 'subiu para o nível 2');
select lives_ok($$ insert into public.goal_contributions (profile_id, goal_id, amount_cents, occurred_on)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000001', -10000, current_date) $$, 'retirada');
select lives_ok($$ insert into public.goal_contributions (profile_id, goal_id, amount_cents, occurred_on)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000001', 10000, current_date) $$, 'meta reaberta e concluída de novo');
select is((select total_xp from public.user_stats), 130::bigint, 'conclusão repetida não rende XP duplo; retirada não rende XP');
select lives_ok($$ insert into public.goals (profile_id, name, kind, target_cents)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Outra', 'save', 5000) $$, 'segunda meta no mesmo dia');
select is((select total_xp from public.user_stats), 130::bigint, 'limite diário de metas criadas');

-- Comemoração de nível
select is((select celebrated_level from public.user_stats), 1, 'comemoração pendente');
select lives_ok($$ select public.acknowledge_level() $$, 'usuário confirma a comemoração');
select is((select celebrated_level from public.user_stats), 2, 'comemoração registrada');

-- Ninguém escreve XP pelo app
select throws_ok($$ insert into public.xp_events (profile_id, source, xp, awarded_on, idempotency_key)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'goal_completed', 999, current_date, 'forjado') $$, '42501', null, 'usuário não insere XP');
select throws_ok($$ update public.user_stats set total_xp = 99999 $$, '42501', null, 'usuário não altera o total');
select throws_ok($$ select public.award_xp('aaaaaaaa-0000-0000-0000-000000000001', 'goal_completed', null, 'forjado') $$, '42501', null, 'usuário não chama a função de XP');
select throws_ok($$ update public.xp_rules set xp = 9999 $$, '42501', null, 'usuário não altera as regras');
select throws_ok($$ insert into public.levels (level, name, min_xp) values (9, 'Falso', 1) $$, '42501', null, 'usuário não altera os níveis');
select is((select count(*)::int from public.xp_rules), 4, 'regras legíveis');
select is((select count(*)::int from public.levels), 8, 'oito níveis legíveis');

-- Isolamento e independência do valor
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.xp_events), 0, 'B não enxerga o XP de A');
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'bbbbbbbb-0000-0000-0000-000000000002', 'expense', 1, current_date, b_wallet, b_exp from ids $$, 'B registra R$ 0,01');
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'bbbbbbbb-0000-0000-0000-000000000002', 'expense', 99999999999, current_date, b_wallet, b_exp from ids $$, 'B registra um valor enorme');
select is((select total_xp from public.user_stats), 20::bigint, 'XP independe do valor: 10 por lançamento');

select * from finish();
rollback;
