-- Testes das preferências de notificação (Etapa 15): tudo desligado por padrão, horário
-- restrito e cada pessoa só altera as próprias preferências.
-- Executar com: npx supabase test db
begin;
select plan(13);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is((select notif_daily_reminder or notif_weekly_review or notif_goal_deadlines or notif_missions or notif_monthly_summary from public.user_settings), false, 'todas as notificações começam desligadas');
select is((select notif_daily_time from public.user_settings), '20:00', 'horário padrão do lembrete: 20:00');

select lives_ok($$ update public.user_settings set notif_daily_reminder = true, notif_daily_time = '08:30' where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, 'A liga o lembrete diário às 08:30');
select is((select notif_daily_time from public.user_settings), '08:30', 'o horário foi salvo');
select lives_ok($$ update public.user_settings set notif_daily_time = '22:00' where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, 'o limite das 22:00 é aceito');
select lives_ok($$ update public.user_settings set notif_daily_time = '07:00' where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, 'o limite das 07:00 é aceito');
select throws_ok($$ update public.user_settings set notif_daily_time = '03:00' where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, '23514', null, 'madrugada é recusada');
select throws_ok($$ update public.user_settings set notif_daily_time = '22:30' where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, '23514', null, 'depois das 22:00 é recusado');
select throws_ok($$ update public.user_settings set notif_daily_time = '8h' where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, '23514', null, 'formato inválido é recusado');
select lives_ok($$ update public.user_settings set notif_weekly_review = true, notif_goal_deadlines = true, notif_missions = true, notif_monthly_summary = true where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' $$, 'A liga as demais opções');

-- B não enxerga nem altera as preferências de A.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.user_settings where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'B não lê as preferências de A');
select is((select notif_daily_reminder from public.user_settings), false, 'as de B continuam desligadas');
update public.user_settings set notif_daily_reminder = true where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001';
reset role;
select is((select notif_daily_time from public.user_settings where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), '07:00', 'B não altera as preferências de A');

select * from finish();
rollback;
