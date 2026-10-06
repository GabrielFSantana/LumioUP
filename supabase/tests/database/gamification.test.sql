-- Testes de sequência, missões e conquistas (Etapa 11). Executar com: npx supabase test db
begin;
select plan(37);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Cida"}');

create temp table ids as
select
  (select id from public.accounts where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and name = 'Carteira') as a_wallet,
  (select id from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'expense' and name = 'Lazer') as a_exp,
  (select id from public.accounts where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and name = 'Carteira') as b_wallet,
  (select id from public.categories where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and kind = 'expense' and name = 'Lazer') as b_exp,
  ((now() at time zone 'America/Sao_Paulo')::date) as today;
grant select on ids to authenticated;

-- Preparação (como administrador): A tinha sequência de 3 dias até ontem; B parou há 5 dias.
insert into public.activity_days (profile_id, day)
  select 'aaaaaaaa-0000-0000-0000-000000000001', today - 1 from ids;
update public.user_stats set current_streak = 3, best_streak = 3, last_active_on = (select today - 1 from ids)
  where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001';
update public.user_stats set current_streak = 9, best_streak = 9, last_active_on = (select today - 5 from ids)
  where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- Sequência (A): ontem + hoje = 4
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 1000, current_date, a_wallet, a_exp from ids $$, 'A registra um lançamento');
select is((select current_streak from public.user_stats), 4, 'dia seguinte ao último soma na sequência');
select is((select best_streak from public.user_stats), 4, 'recorde acompanha a sequência');
select is((select last_active_on from public.user_stats), (select today from ids), 'último dia ativo é hoje (dia da ação)');
select is((select count(*)::int from public.activity_days), 2, 'ontem e hoje marcados');
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 2000, current_date, a_wallet, a_exp from ids $$, 'segundo lançamento do dia');
select is((select current_streak from public.user_stats), 4, 'mais ações no mesmo dia não somam');
select is((select count(*)::int from public.xp_events where source = 'active_day'), 1, 'dia organizado rende XP uma vez por dia');

-- Lançar com data antiga não cria dias de atividade passados
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 3000, current_date - 20, a_wallet, a_exp from ids $$, 'lançamento com data antiga');
select is((select count(*)::int from public.activity_days), 2, 'data antiga do lançamento não estende a sequência');

-- Missões (A): dois lançamentos que renderam XP completam a missão diária
select is((select completed_at is not null from public.user_missions where template_code = 'daily_log_2'), true, 'missão diária concluída');
select is((select count(*)::int from public.xp_events where source = 'mission_completed'), 1, 'missão rende XP uma vez');
select is((select progress from public.user_missions where template_code = 'weekly_log_10'), 3, 'missão semanal acompanha os lançamentos');
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 1000, current_date, a_wallet, a_exp from ids $$, 'lançamento duplicado');
select is((select progress from public.user_missions where template_code = 'daily_log_2'), 3, 'duplicado não conta para missões');

-- Conquistas (A)
select is((select count(*)::int from public.user_achievements where code = 'first_transaction'), 1, 'conquista do primeiro lançamento');
select is((select count(*)::int from public.user_achievements where code = 'streak_3'), 1, 'conquista de 3 dias seguidos');
select lives_ok($$ insert into public.goals (id, profile_id, name, kind, target_cents)
  values ('aaaaaaaa-3333-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Viagem', 'trip', 100000) $$, 'A cria uma meta');
select lives_ok($$ insert into public.goal_contributions (profile_id, goal_id, amount_cents, occurred_on)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000001', 1000, current_date) $$, 'A contribui');
select is((select count(*)::int from public.user_achievements), 4, 'quatro conquistas: lançamento, sequência, meta e contribuição');
select is((select completed_at is not null from public.user_missions where template_code = 'daily_goal'), true, 'missão de guardar concluída');
select is((select total_xp from public.user_stats), (select sum(xp) from public.xp_events), 'total igual à soma do livro-razão');

-- Ninguém escreve conquistas, missões ou sequência pelo app
select throws_ok($$ insert into public.user_achievements (profile_id, code) values ('aaaaaaaa-0000-0000-0000-000000000001', 'goal_done') $$, '42501', null, 'usuário não se concede conquistas');
select throws_ok($$ update public.user_missions set progress = 99 $$, '42501', null, 'usuário não altera missões');
select throws_ok($$ select public.bump_missions('aaaaaaaa-0000-0000-0000-000000000001', 'transactions_created', 5) $$, '42501', null, 'usuário não chama o avanço de missões');
select throws_ok($$ select public.mark_active_day('aaaaaaaa-0000-0000-0000-000000000001') $$, '42501', null, 'usuário não marca dias ativos');
select throws_ok($$ select public.check_achievements('aaaaaaaa-0000-0000-0000-000000000001') $$, '42501', null, 'usuário não dispara a checagem de conquistas');
select throws_ok($$ update public.user_stats set current_streak = 999 $$, '42501', null, 'usuário não altera a sequência');
select throws_ok($$ update public.achievements set xp_reward = 200 $$, '42501', null, 'usuário não altera o catálogo de conquistas');
select throws_ok($$ insert into public.mission_templates (code, period, title, description, metric, target, xp_reward)
  values ('x', 'daily', 'x', 'x', 'active_days', 1, 100) $$, '42501', null, 'usuário não cria missões');
select is((select count(*)::int from public.achievements), 13, 'catálogo de conquistas legível');
select is((select count(*)::int from public.mission_templates), 4, 'modelos de missão legíveis');

-- Sequência quebrada (B): recomeça em 1, recorde mantido
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok($$ insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
  select 'bbbbbbbb-0000-0000-0000-000000000002', 'expense', 500, current_date, b_wallet, b_exp from ids $$, 'B volta a registrar');
select is((select current_streak from public.user_stats), 1, 'sequência quebrada recomeça em 1');
select is((select best_streak from public.user_stats), 9, 'recorde anterior é mantido');
select is((select count(*)::int from public.user_achievements where code = 'streak_7'), 1, 'recorde de 9 dias já liberou a conquista de 7');

-- Isolamento (C não vê nada de A e B)
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.activity_days) + (select count(*)::int from public.user_missions)
  + (select count(*)::int from public.user_achievements), 0, 'C não enxerga dias, missões nem conquistas de outros');

select * from finish();
rollback;
