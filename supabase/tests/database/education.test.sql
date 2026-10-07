-- Testes da área Aprender (Etapa 14): gabarito escondido, XP uma vez por artigo/quiz/trilha,
-- limite diário, progresso privado e recomendações sem valores.
-- Executar com: npx supabase test db
begin;
select plan(62);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- ===== Conteúdo legível, gabarito não =====
select is((select count(*)::int from public.articles), 8, 'o app lê os 8 artigos');
select is((select count(*)::int from public.track_items where track_slug = 'primeiros-passos'), 8, 'a trilha tem 8 artigos');
select cmp_ok((select count(*)::int from public.glossary_terms), '>=', 15, 'o glossário está disponível');
select is((select count(*)::int from public.quiz_questions), 24, 'o app lê as 24 perguntas (sem o gabarito)');
select is((select count(*)::int from (select id, prompt, options from public.quiz_questions) q where array_length(options, 1) >= 2), 24, 'as opções de resposta são legíveis');
select throws_ok($$ select correct_index from public.quiz_questions $$, '42501', null, 'o gabarito não é legível pelo app');
select throws_ok($$ select explanation from public.quiz_questions $$, '42501', null, 'a explicação só vem depois de responder');
select throws_ok($$ select * from public.quiz_questions $$, '42501', null, 'select * também é barrado');
select throws_ok($$ update public.articles set title = 'Hack' $$, '42501', null, 'o app não altera artigos');
select throws_ok($$ insert into public.article_progress (profile_id, article_slug, completed_at) values ('aaaaaaaa-0000-0000-0000-000000000001', 'orcamento', now()) $$, '42501', null, 'o app não grava progresso direto');
select throws_ok($$ update public.quiz_questions set position = 9 $$, '42501', null, 'o app não altera perguntas');

-- ===== Ler um artigo =====
select throws_ok($$ select public.complete_article('nao-existe') $$, 'P0001', 'article_not_found', 'artigo inexistente é recusado');
select lives_ok($$ select public.complete_article('organizacao-financeira') $$, 'A marca o primeiro artigo como lido');
select is((select count(*)::int from public.xp_events where source = 'lesson_done'), 1, 'rende XP de leitura');
select is((select xp from public.xp_events where source = 'lesson_done'), 15, 'o XP é o da regra (15)');
select lives_ok($$ select public.complete_article('organizacao-financeira') $$, 'marcar de novo não dá erro');
select is((select count(*)::int from public.xp_events where source = 'lesson_done'), 1, 'mas não rende XP outra vez');
select is((select count(*)::int from public.activity_days), 1, 'estudar conta como dia organizado');
select is((select count(*)::int from public.user_achievements where code = 'first_lesson'), 1, 'desbloqueia "Primeira lição"');

-- ===== Quiz =====
select throws_ok($$ select * from public.submit_quiz('nao-existe', array[0]) $$, 'P0001', 'quiz_not_found', 'quiz inexistente');
select throws_ok($$ select * from public.submit_quiz('organizacao-financeira', array[1, 0]) $$, 'P0001', 'invalid_answers', 'número de respostas errado');
select throws_ok($$ select * from public.submit_quiz('organizacao-financeira', null) $$, 'P0001', 'invalid_answers', 'respostas nulas');
select is((select count(*)::int from public.submit_quiz('organizacao-financeira', array[0, 1, 0])), 3, 'devolve uma linha por pergunta');
select is((select quiz_best_pct from public.article_progress where article_slug = 'organizacao-financeira'), 0, 'tudo errado: 0%');
select is((select count(*)::int from public.xp_events where source = 'quiz_done'), 0, 'reprovado não rende XP');
select is((select array_agg(is_correct order by question_position) from public.submit_quiz('organizacao-financeira', array[1, 0, 0])), array[true, true, false], '2 de 3: aponta o que acertou');
select is((select count(*)::int from public.xp_events where source = 'quiz_done'), 1, 'aprovado (2 de 3) rende XP');
select is((select xp from public.xp_events where source = 'quiz_done'), 20, 'o XP do quiz é o da regra (20)');
select isnt((select quiz_passed_at from public.article_progress where article_slug = 'organizacao-financeira'), null, 'registra a aprovação');
select isnt((select explanation from public.submit_quiz('organizacao-financeira', array[1, 0, 1]) where question_position = 1), null, 'a explicação vem junto do resultado');
select is((select count(*)::int from public.xp_events where source = 'quiz_done'), 1, 'aprovar de novo não repete o XP');
select is((select quiz_best_pct from public.article_progress where article_slug = 'organizacao-financeira'), 100, 'guarda a melhor nota');
select is((select count(*)::int from public.submit_quiz('orcamento', array[1, 1, 1])), 3, 'quiz sem ler o artigo também funciona');
select is((select completed_at from public.article_progress where article_slug = 'orcamento'), null, 'e não marca o artigo como lido');

-- ===== Limite diário de XP de leitura e trilha =====
select lives_ok($$ select public.complete_article('orcamento') $$, 'lê "orçamento" (que já tinha quiz feito)');
select lives_ok($$ select public.complete_article('fluxo-de-caixa') $$, 'lê o 3º artigo do dia');
select lives_ok($$ select public.complete_article('despesas-recorrentes') $$, 'lê o 4º artigo do dia');
select is((select count(*)::int from public.xp_events where source = 'lesson_done'), 3, 'o XP de leitura para em 3 por dia');
select is((select count(*)::int from public.article_progress where completed_at is not null), 4, 'mas os 4 artigos ficam como lidos');
select is((select count(*)::int from public.xp_events where source = 'track_done'), 0, 'trilha incompleta não rende XP');
select lives_ok($$ select public.complete_article('reserva-de-emergencia') $$, 'lê o 5º');
select lives_ok($$ select public.complete_article('metas-financeiras') $$, 'lê o 6º');
select lives_ok($$ select public.complete_article('juros-e-inflacao') $$, 'lê o 7º');
select is((select count(*)::int from public.xp_events where source = 'track_done'), 0, 'faltando um, nada de XP da trilha');
select lives_ok($$ select public.complete_article('risco-liquidez-diversificacao') $$, 'lê o último');
select is((select count(*)::int from public.xp_events where source = 'track_done'), 1, 'trilha concluída rende XP uma vez');
select is((select xp from public.xp_events where source = 'track_done'), 50, 'o XP da trilha é o da regra (50)');
select is((select count(*)::int from public.user_achievements where code = 'five_lessons'), 1, 'desbloqueia "Estudioso"');
select is_empty($$ select * from public.recommended_articles() $$, 'quem leu tudo não recebe sugestões');

-- ===== Recomendação contextual (B) =====
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*)::int from public.article_progress), 0, 'o progresso de A é privado');
select is((select count(*)::int from public.xp_events), 0, 'o XP de A também');
select is((select array_agg(article_slug order by article_slug) from public.recommended_articles()), array['metas-financeiras', 'orcamento', 'organizacao-financeira']::text[], 'sem registros: meta e próximos passos da trilha');
select is((select article_slug from public.recommended_articles() limit 1), 'metas-financeiras', 'sem metas, a primeira sugestão é sobre metas');

reset role;
-- B gasta mais do que recebe e registra várias assinaturas.
insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
select 'bbbbbbbb-0000-0000-0000-000000000002', 'income', 10000, (now() at time zone 'America/Sao_Paulo')::date,
  (select id from public.accounts where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' limit 1),
  (select id from public.categories where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and kind = 'income' limit 1);
insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
select 'bbbbbbbb-0000-0000-0000-000000000002', 'expense', 7000 + g, (now() at time zone 'America/Sao_Paulo')::date,
  (select id from public.accounts where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' limit 1),
  (select id from public.categories where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' and name = 'Assinaturas' limit 1)
from generate_series(1, 3) g;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select array_agg(article_slug order by article_slug) from public.recommended_articles()), array['despesas-recorrentes', 'fluxo-de-caixa', 'metas-financeiras']::text[], 'saídas acima das entradas e assinaturas: fluxo de caixa, despesas e metas');
select is((select article_slug from public.recommended_articles() limit 1), 'fluxo-de-caixa', 'a prioridade é o fluxo de caixa');
select is((select count(*)::int from public.recommended_articles() where reason ~ 'R\$|[0-9]{3}'), 0, 'os motivos não trazem valores');
select lives_ok($$ select public.complete_article('fluxo-de-caixa') $$, 'B lê o artigo sugerido');
select is((select count(*)::int from public.recommended_articles() where article_slug = 'fluxo-de-caixa'), 0, 'o que já foi lido sai das sugestões');

-- ===== Anônimo não acessa =====
set local role anon;
select throws_ok($$ select * from public.articles $$, '42501', null, 'anônimo não lê artigos');
select throws_ok($$ select public.complete_article('orcamento') $$, '42501', null, 'anônimo não marca leitura');
select throws_ok($$ select * from public.submit_quiz('orcamento', array[1, 1, 1]) $$, '42501', null, 'anônimo não responde quiz');
select throws_ok($$ select * from public.recommended_articles() $$, '42501', null, 'anônimo não recebe sugestões');

select * from finish();
rollback;
