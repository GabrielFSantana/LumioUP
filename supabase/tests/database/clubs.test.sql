-- Testes de clubes: permissões por papel e, principalmente, PRIVACIDADE (Etapa 12).
-- Executar com: npx supabase test db
begin;
select plan(74);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Cida"}'),
  ('dddddddd-0000-0000-0000-000000000004', 'd@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Davi"}'),
  ('eeeeeeee-0000-0000-0000-000000000005', 'e@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Eva"}');

create temp table ctx (club uuid, code text, old_code text);
grant all on ctx to authenticated;

-- Dados financeiros de A, que NENHUM colega de clube pode enxergar.
insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
select 'aaaaaaaa-0000-0000-0000-000000000001', 'expense', 12345, current_date,
  (select id from public.accounts where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' limit 1),
  (select id from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'expense' limit 1);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- ===== Criar clube (A) =====
select lives_ok($$ select public.create_club('Poupadores', 'Clube de teste') $$, 'A cria um clube');
select lives_ok($$ insert into ctx select id, invite_code, null from public.clubs where name = 'Poupadores' $$, 'guarda clube e código');
select is((select role from public.club_members where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 'owner', 'quem cria é o dono');
select matches((select code from ctx), '^[A-HJ-NP-Z2-9]{8}$', 'código de 8 caracteres sem letras ambíguas');
select throws_ok($$ select public.create_club('   ') $$, 'P0001', 'invalid_name', 'nome vazio é rejeitado');

-- Escrita direta é proibida: tudo passa pelas funções
select throws_ok($$ insert into public.clubs (name, owner_id, invite_code) values ('Falso', 'aaaaaaaa-0000-0000-0000-000000000001', 'AAAAAAAA') $$, '42501', null, 'não cria clube direto na tabela');
select throws_ok($$ update public.clubs set name = 'Hack' $$, '42501', null, 'não edita clube direto na tabela');
select throws_ok($$ delete from public.club_members $$, '42501', null, 'não apaga membros direto na tabela');
select is((select count(*)::int from public.transactions), 1, 'controle: o lançamento de A existe e A o enxerga');
select is((select count(*)::int from public.xp_events) > 0, true, 'controle: A tem histórico de XP');

-- ===== Quem não é membro não lê nada (C) =====
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is_empty($$ select * from public.clubs $$, 'não membro não vê clubes');
select is_empty($$ select * from public.club_members $$, 'não membro não vê membros');
select throws_ok($$ select * from public.list_club_members((select club from ctx)) $$, '42501', 'not_a_member', 'não membro não lista membros');
select is((select name from public.preview_club((select code from ctx))), 'Poupadores', 'com o código dá para ver só o nome');
select is_empty($$ select * from public.preview_club('ZZZZ2222') $$, 'código inválido não retorna nada');
select throws_ok($$ select public.remove_member((select club from ctx), 'aaaaaaaa-0000-0000-0000-000000000001') $$, '42501', 'not_allowed', 'não membro não remove ninguém');
select throws_ok($$ select public.update_club((select club from ctx), 'Hack', null, true) $$, '42501', 'not_allowed', 'não membro não edita');
select throws_ok($$ select public.set_member_role((select club from ctx), 'aaaaaaaa-0000-0000-0000-000000000001', 'member') $$, '42501', 'not_allowed', 'não membro não muda papéis');
select throws_ok($$ select public.delete_club((select club from ctx)) $$, '42501', 'not_allowed', 'não membro não apaga o clube');
select throws_ok($$ select public.regenerate_invite_code((select club from ctx)) $$, '42501', 'not_allowed', 'não membro não troca o código');

-- ===== Entrar por código (B) e privacidade entre colegas =====
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok($$ select public.join_club(lower(substr((select code from ctx), 1, 4) || '-' || substr((select code from ctx), 5))) $$, 'B entra com o código em minúsculas e com hífen');
select is((select count(*)::int from public.club_members), 2, 'B enxerga os 2 membros do clube');
select is((select public.join_club((select code from ctx))), (select club from ctx), 'entrar de novo é idempotente');
select is((select display_name from public.list_club_members((select club from ctx)) where role = 'owner'), 'Ana', 'B vê o nome do dono');
select isnt((select level from public.list_club_members((select club from ctx)) where role = 'owner'), null, 'nível aparece quando o dono aceita o ranking');

select is((select count(*)::int from public.transactions where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'colega NÃO lê lançamentos de A');
select is((select count(*)::int from public.accounts where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'colega NÃO lê contas de A');
select is((select count(*)::int from public.categories where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'colega NÃO lê categorias de A');
select is((select count(*)::int from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'colega NÃO lê o perfil de A direto');
select is((select count(*)::int from public.user_stats where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'colega NÃO lê as estatísticas de A direto');
select is((select count(*)::int from public.xp_events where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'colega NÃO lê o histórico de XP de A');

select throws_ok($$ select public.set_member_role((select club from ctx), 'aaaaaaaa-0000-0000-0000-000000000001', 'member') $$, '42501', 'not_allowed', 'membro não muda papéis');
select throws_ok($$ select public.remove_member((select club from ctx), 'aaaaaaaa-0000-0000-0000-000000000001') $$, '42501', 'not_allowed', 'membro não remove o dono');
select throws_ok($$ select public.regenerate_invite_code((select club from ctx)) $$, '42501', 'not_allowed', 'membro não troca o código');
select throws_ok($$ select public.update_club((select club from ctx), 'Hack', null, true) $$, '42501', 'not_allowed', 'membro não edita o clube');

-- ===== Admin (D) =====
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', true);
select lives_ok($$ select public.join_club((select code from ctx)) $$, 'D entra no clube');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$ select public.set_member_role((select club from ctx), 'dddddddd-0000-0000-0000-000000000004', 'admin') $$, 'dono promove D a admin');
select is((select role from public.list_club_members((select club from ctx)) where display_name = 'Davi'), 'admin', 'D agora é admin');

select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', true);
select lives_ok($$ update ctx set old_code = code, code = public.regenerate_invite_code(club) $$, 'admin renova o código');
select isnt((select code from ctx), (select old_code from ctx), 'o código mudou');
select is_empty($$ select * from public.preview_club((select old_code from ctx)) $$, 'código antigo deixa de funcionar');
select isnt_empty($$ select * from public.preview_club((select code from ctx)) $$, 'código novo funciona');
select throws_ok($$ select public.remove_member((select club from ctx), 'aaaaaaaa-0000-0000-0000-000000000001') $$, '42501', 'not_allowed', 'admin não remove o dono');
select throws_ok($$ select public.set_member_role((select club from ctx), 'bbbbbbbb-0000-0000-0000-000000000002', 'admin') $$, '42501', 'not_allowed', 'admin não promove ninguém');
select throws_ok($$ select public.delete_club((select club from ctx)) $$, '42501', 'not_allowed', 'admin não apaga o clube');
select lives_ok($$ select public.remove_member((select club from ctx), 'bbbbbbbb-0000-0000-0000-000000000002') $$, 'admin remove um membro');
select is((select count(*)::int from public.club_members), 2, 'restam dono e admin');

select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is_empty($$ select * from public.clubs $$, 'removido deixa de ver o clube');
select throws_ok($$ select * from public.list_club_members((select club from ctx)) $$, '42501', 'not_a_member', 'removido deixa de listar membros');
select lives_ok($$ select public.join_club((select code from ctx)) $$, 'B volta com o código novo');

-- ===== Capacidade e convites desligados =====
reset role;
update public.clubs set max_members = 3;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok($$ select public.join_club((select code from ctx)) $$, 'P0001', 'club_full', 'clube cheio não aceita mais gente');
reset role;
update public.clubs set max_members = 20;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$ select public.update_club((select club from ctx), 'Poupadores', 'Nova descrição', false) $$, 'dono desliga a entrada por código');
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select throws_ok($$ select public.join_club((select code from ctx)) $$, 'P0001', 'invites_disabled', 'entrada desligada bloqueia novos membros');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$ select public.update_club((select club from ctx), 'Poupadores', 'Nova descrição', true) $$, 'dono liga de novo');

-- ===== Respeito à configuração de ranking =====
select lives_ok($$ update public.user_settings set show_in_club_ranking = false $$, 'A deixa de aparecer no ranking');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select level from public.list_club_members((select club from ctx)) where role = 'owner'), null, 'sem consentimento, nível de A não aparece');
select is((select total_xp from public.list_club_members((select club from ctx)) where role = 'owner'), null, 'sem consentimento, XP de A não aparece');
select is((select display_name from public.list_club_members((select club from ctx)) where role = 'owner'), 'Ana', 'o nome continua visível (ela segue no clube)');
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select isnt((select level from public.list_club_members((select club from ctx)) where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'), null, 'A sempre vê os próprios dados');

-- ===== Dono: sair, transferir, apagar =====
select throws_ok($$ select public.leave_club((select club from ctx)) $$, 'P0001', 'owner_must_transfer', 'dono não sai sem transferir');
select throws_ok($$ select public.transfer_ownership((select club from ctx), 'aaaaaaaa-0000-0000-0000-000000000001') $$, '42501', 'not_allowed', 'não transfere para si mesmo');
select lives_ok($$ select public.transfer_ownership((select club from ctx), 'dddddddd-0000-0000-0000-000000000004') $$, 'dono transfere para D');
select is((select role from public.list_club_members((select club from ctx)) where display_name = 'Ana'), 'admin', 'A virou admin');
select is((select role from public.list_club_members((select club from ctx)) where display_name = 'Davi'), 'owner', 'D virou dono');
select is((select owner_id from public.clubs), 'dddddddd-0000-0000-0000-000000000004'::uuid, 'o dono do clube foi atualizado');
select lives_ok($$ select public.leave_club((select club from ctx)) $$, 'A (agora admin) sai do clube');
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok($$ select public.delete_club((select club from ctx)) $$, '42501', 'not_allowed', 'membro não apaga o clube');
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', true);
select lives_ok($$ select public.delete_club((select club from ctx)) $$, 'dono apaga o clube');
reset role;
select is((select count(*)::int from public.club_members where club_id = (select club from ctx)), 0, 'apagar o clube remove todos os vínculos');
set local role authenticated;

-- ===== Força bruta no código =====
select set_config('request.jwt.claims', '{"sub":"eeeeeeee-0000-0000-0000-000000000005","role":"authenticated"}', true);
select lives_ok($$ do $b$ begin for i in 1..10 loop perform public.preview_club('AAAAAAAA'); end loop; end $b$ $$, 'dez tentativas inválidas seguidas');
select throws_ok($$ select * from public.preview_club('AAAAAAAA') $$, 'P0001', 'too_many_attempts', 'a décima primeira é bloqueada');
select throws_ok($$ select public.join_club('AAAAAAAA') $$, 'P0001', 'too_many_attempts', 'entrar também fica bloqueado');

-- ===== Anônimo não acessa nada =====
reset role;
set local role anon;
select throws_ok($$ select * from public.clubs $$, '42501', null, 'anônimo não lê clubes');
select throws_ok($$ select public.list_my_clubs() $$, '42501', null, 'anônimo não chama funções de clube');
reset role;

select * from finish();
rollback;
