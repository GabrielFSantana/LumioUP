-- Testes de desafios e ranking dos clubes (Etapa 13): permissões, progresso calculado no
-- servidor, XP uma única vez e privacidade (só ações e percentuais, nunca valores em reais).
-- Executar com: npx supabase test db
begin;
select plan(71);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Cida"}'),
  ('dddddddd-0000-0000-0000-000000000004', 'd@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Davi"}'),
  ('eeeeeeee-0000-0000-0000-000000000005', 'e@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Eva"}');

create temp table ctx (club uuid, code text, ch uuid, club_e uuid, ch_e uuid, ch_old uuid, today date);
grant all on ctx to authenticated;
insert into ctx (today) values ((now() at time zone 'America/Sao_Paulo')::date);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
update ctx set club = public.create_club('Poupadores', null);
update ctx set code = (select invite_code from public.clubs where id = (select club from ctx));
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.join_club((select code from ctx));
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', true);
select public.join_club((select code from ctx));

-- ===== Quem pode criar =====
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_count', 'Hack', (select today from ctx), (select today + 9 from ctx), 5) $$, '42501', 'not_allowed', 'membro comum não cria desafio');
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_count', 'Hack', (select today from ctx), (select today + 9 from ctx), 5) $$, '42501', 'not_allowed', 'quem não é membro não cria desafio');

-- ===== Validações (A, dona) =====
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_count', '   ', (select today from ctx), (select today + 9 from ctx), 5) $$, 'P0001', 'invalid_title', 'título vazio é rejeitado');
select throws_ok($$ select public.create_challenge((select club from ctx), 'save_amount', 'X', (select today from ctx), (select today + 9 from ctx), 5) $$, 'P0001', 'invalid_kind', 'não existe desafio de valor em reais');
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_count', 'X', (select today - 1 from ctx), (select today + 9 from ctx), 5) $$, 'P0001', 'invalid_dates', 'não começa no passado');
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_count', 'X', (select today + 5 from ctx), (select today + 2 from ctx), 5) $$, 'P0001', 'invalid_dates', 'fim antes do início');
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_count', 'X', (select today from ctx), (select today + 90 from ctx), 5) $$, 'P0001', 'invalid_dates', 'duração máxima de 90 dias');
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_count', 'X', (select today from ctx), (select today + 9 from ctx), 2) $$, 'P0001', 'invalid_target', 'meta mínima de lançamentos');
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_days', 'X', (select today from ctx), (select today + 4 from ctx), 6) $$, 'P0001', 'invalid_target', 'dias organizados não pode passar da duração');
select throws_ok($$ select public.create_challenge((select club from ctx), 'goal_contributions', 'X', (select today from ctx), (select today + 9 from ctx), 1) $$, 'P0001', 'invalid_target', 'meta mínima de contribuições');
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_count', 'X', (select today from ctx), (select today + 9 from ctx), 101) $$, 'P0001', 'invalid_target', 'meta máxima');

-- Escrita direta é proibida
select throws_ok($$ insert into public.challenges (club_id, kind, title, starts_on, ends_on, target) values ((select club from ctx), 'log_count', 'Falso', current_date, current_date + 5, 5) $$, '42501', null, 'não cria desafio direto na tabela');
select throws_ok($$ update public.challenge_participants set completed_at = now() $$, '42501', null, 'não marca conclusão direto');
select throws_ok($$ select * from public.challenge_participants $$, '42501', null, 'participantes só pela função (sem leitura direta)');

-- ===== Criar (A) =====
select lives_ok($$ update ctx set ch = public.create_challenge((select club from ctx), 'log_count', 'Dez dias de organização', (select today from ctx), (select today + 9 from ctx), 5) $$, 'A cria um desafio');
select is((select participant_count from public.list_challenges((select club from ctx)) where id = (select ch from ctx)), 1, 'quem cria já participa');
select is((select status from public.list_challenges((select club from ctx)) where id = (select ch from ctx)), 'active', 'começa hoje: em andamento');

-- ===== Não membro não vê nada =====
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is_empty($$ select * from public.challenges $$, 'não membro não lê desafios');
select throws_ok($$ select * from public.list_challenges((select club from ctx)) $$, '42501', 'not_a_member', 'não membro não lista desafios');
select throws_ok($$ select * from public.challenge_standings((select ch from ctx)) $$, '42501', 'not_a_member', 'não membro não vê o placar');
select throws_ok($$ select * from public.club_ranking((select club from ctx), 'week') $$, '42501', 'not_a_member', 'não membro não vê o ranking');
select throws_ok($$ select public.join_challenge((select ch from ctx)) $$, '42501', 'not_allowed', 'não membro não entra no desafio');
select throws_ok($$ select public.delete_challenge((select ch from ctx)) $$, '42501', 'not_allowed', 'não membro não apaga desafio');

-- ===== Entrar (B, D) =====
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok($$ select public.join_challenge((select ch from ctx)) $$, 'B entra no desafio');
select lives_ok($$ select public.join_challenge((select ch from ctx)) $$, 'entrar de novo é idempotente');
select is((select participant_count from public.list_challenges((select club from ctx)) where id = (select ch from ctx)), 2, 'dois participantes');
select is((select joined from public.list_challenges((select club from ctx)) where id = (select ch from ctx)), true, 'B aparece como participante');
select throws_ok($$ select public.delete_challenge((select ch from ctx)) $$, '42501', 'not_allowed', 'membro comum não apaga o desafio dos outros');
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', true);
select lives_ok($$ select public.join_challenge((select ch from ctx)) $$, 'D entra no desafio');

-- ===== Progresso calculado no servidor (B registra lançamentos) =====
reset role;
insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
select 'bbbbbbbb-0000-0000-0000-000000000002', 'expense', 1000 + g, current_date,
  (select id from public.accounts where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' limit 1),
  (select id from public.categories where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and kind = 'expense' limit 1)
from generate_series(1, 3) g;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select progress_pct from public.challenge_standings((select ch from ctx)) where is_self), 60, '3 de 5 lançamentos = 60%');
select is((select completed from public.challenge_standings((select ch from ctx)) where is_self), false, 'ainda não concluiu');
select is((select count(*)::int from public.xp_events where source = 'challenge_done'), 0, 'sem XP de desafio antes de concluir');

reset role;
insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
select 'bbbbbbbb-0000-0000-0000-000000000002', 'expense', 2000 + g, current_date,
  (select id from public.accounts where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' limit 1),
  (select id from public.categories where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and kind = 'expense' limit 1)
from generate_series(1, 2) g;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select progress_pct from public.challenge_standings((select ch from ctx)) where is_self), 100, '5 de 5 = 100%');
select is((select completed from public.challenge_standings((select ch from ctx)) where is_self), true, 'concluído');
select is((select count(*)::int from public.xp_events where source = 'challenge_done'), 1, 'XP do desafio concedido uma vez');
select is((select xp from public.xp_events where source = 'challenge_done'), 40, 'o XP do desafio é o da regra (40)');
select isnt((select my_completed_at from public.list_challenges((select club from ctx)) where id = (select ch from ctx)), null, 'a lista mostra a conclusão');

reset role;
insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
select 'bbbbbbbb-0000-0000-0000-000000000002', 'expense', 3000, current_date,
  (select id from public.accounts where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' limit 1),
  (select id from public.categories where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and kind = 'expense' limit 1);
select is((select count(*)::int from public.xp_events where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and source = 'challenge_done'), 1, 'mais lançamentos não repetem o XP');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select progress_pct from public.challenge_standings((select ch from ctx)) where is_self), 0, 'o progresso de A é só dela: 0%');

-- Só conta o que foi feito depois de entrar
reset role;
update public.challenge_participants set joined_on = current_date + 1
  where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select action_count from public.challenge_standings((select ch from ctx)) where is_self), 0, 'ações anteriores à entrada não contam');
reset role;
update public.challenge_participants set joined_on = current_date
  where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002';
set local role authenticated;

-- ===== Privacidade: placar e ranking =====
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', true);
select lives_ok($$ update public.user_settings set show_in_club_ranking = false where profile_id = 'dddddddd-0000-0000-0000-000000000004' $$, 'D desliga o ranking');
select is((select count(*)::int from public.challenge_standings((select ch from ctx)) where not is_self and display_name = 'Davi'), 0, 'D não aparece para os outros no placar');
select is((select count(*)::int from public.challenge_standings((select ch from ctx)) where is_self), 1, 'D vê a própria linha');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*)::int from public.challenge_standings((select ch from ctx)) where display_name = 'Davi'), 0, 'A não vê D no placar');
select is((select count(*)::int from public.club_ranking((select club from ctx), 'week') where display_name = 'Davi'), 0, 'A não vê D no ranking');
select is((select rank from public.club_ranking((select club from ctx), 'week') where display_name = 'Beto'), 1, 'Beto lidera por XP na semana');
select is((select rank from public.club_ranking((select club from ctx), 'week') where is_self), 2, 'A vem em seguida');
select is((select xp > 0 from public.club_ranking((select club from ctx), 'month') where display_name = 'Beto'), true, 'XP do mês de Beto');
select is((select xp >= 0 from public.club_ranking((select club from ctx), 'all') where is_self), true, 'ranking geral funciona');
select throws_ok($$ select * from public.club_ranking((select club from ctx), 'year') $$, 'P0001', 'invalid_period', 'período inválido é rejeitado');
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is((select rank from public.club_ranking((select club from ctx), 'week') where is_self), null, 'D vê a própria linha, sem posição');
select is((select count(*)::int from public.club_ranking((select club from ctx), 'week')), 3, 'D vê: ele mesmo + os 2 que aparecem');

-- O ranking e o placar não expõem valores em reais: nenhuma coluna monetária
select is((select count(*)::int from information_schema.columns
  where table_schema = 'public' and table_name in ('challenges', 'challenge_participants')
    and column_name like '%cents%'), 0, 'tabelas de desafio não têm colunas de valor em reais');
select is((select count(*)::int from public.challenge_standings((select ch from ctx)) s
  where s.progress_pct > 100 or s.progress_pct < 0), 0, 'percentual sempre entre 0 e 100');

-- ===== Sair do desafio e apagar =====
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok($$ select public.leave_challenge((select ch from ctx)) $$, 'B sai do desafio');
select is((select joined from public.list_challenges((select club from ctx)) where id = (select ch from ctx)), false, 'B não participa mais');

-- Desafio encerrado não aceita entrada
reset role;
insert into public.challenges (club_id, created_by, kind, title, starts_on, ends_on, target)
values ((select club from ctx), 'aaaaaaaa-0000-0000-0000-000000000001', 'log_count', 'Antigo', current_date - 30, current_date - 20, 5);
update ctx set ch_old = (select id from public.challenges where title = 'Antigo');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$ select public.join_challenge((select ch_old from ctx)) $$, 'P0001', 'challenge_ended', 'não entra em desafio encerrado');
select is((select status from public.list_challenges((select club from ctx)) where id = (select ch_old from ctx)), 'ended', 'status encerrado depois da data final');

-- Limite de desafios ativos por clube (já há 1 ativo; o encerrado não conta)
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$ select public.create_challenge((select club from ctx), 'log_days', 'D2', (select today from ctx), (select today + 9 from ctx), 3) $$, 'segundo desafio ativo');
select lives_ok($$ select public.create_challenge((select club from ctx), 'log_days', 'D3', (select today from ctx), (select today + 9 from ctx), 3) $$, 'terceiro desafio ativo');
select lives_ok($$ select public.create_challenge((select club from ctx), 'goal_contributions', 'D4', (select today + 2 from ctx), (select today + 9 from ctx), 2) $$, 'quarto, que começa no futuro');
select lives_ok($$ select public.create_challenge((select club from ctx), 'log_days', 'D5', (select today from ctx), (select today + 9 from ctx), 3) $$, 'quinto desafio ativo');
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_days', 'D6', (select today from ctx), (select today + 9 from ctx), 3) $$, 'P0001', 'too_many_challenges', 'o sexto é recusado');
select is((select status from public.list_challenges((select club from ctx)) where title = 'D4'), 'upcoming', 'desafio futuro aparece como "em breve"');

select lives_ok($$ select public.delete_challenge((select ch from ctx)) $$, 'dona apaga o desafio');
reset role;
select is((select count(*)::int from public.challenge_participants where challenge_id = (select ch from ctx)), 0, 'apagar remove os participantes');
set local role authenticated;

-- ===== Clube de uma pessoa só não rende XP de desafio =====
select set_config('request.jwt.claims', '{"sub":"eeeeeeee-0000-0000-0000-000000000005","role":"authenticated"}', true);
update ctx set club_e = public.create_club('Só eu', null);
update ctx set ch_e = public.create_challenge((select club_e from ctx), 'log_count', 'Sozinha', (select today from ctx), (select today + 9 from ctx), 5);
reset role;
insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
select 'eeeeeeee-0000-0000-0000-000000000005', 'expense', 500 + g, current_date,
  (select id from public.accounts where profile_id = 'eeeeeeee-0000-0000-0000-000000000005' limit 1),
  (select id from public.categories where profile_id = 'eeeeeeee-0000-0000-0000-000000000005' and kind = 'expense' limit 1)
from generate_series(1, 5) g;
select isnt((select completed_at from public.challenge_participants where challenge_id = (select ch_e from ctx)), null, 'o desafio de Eva é concluído');
select is((select count(*)::int from public.xp_events where profile_id = 'eeeeeeee-0000-0000-0000-000000000005' and source = 'challenge_done'), 0, 'mas sem XP, pois o clube tem 1 membro');

-- ===== Anônimo não acessa =====
set local role anon;
select throws_ok($$ select * from public.list_challenges((select club from ctx)) $$, '42501', null, 'anônimo não lista desafios');
select throws_ok($$ select * from public.club_ranking((select club from ctx), 'week') $$, '42501', null, 'anônimo não vê o ranking');
select throws_ok($$ select public.create_challenge((select club from ctx), 'log_count', 'X', current_date, current_date + 9, 5) $$, '42501', null, 'anônimo não cria desafio');

select * from finish();
rollback;
