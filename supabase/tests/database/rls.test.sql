-- Testes de isolamento (RLS) das tabelas da Etapa 3. Executar com: npx supabase test db
begin;
select plan(14);

-- Dois usuários; o gatilho cria perfil, configurações e consentimentos.
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated',
   '{"display_name":"Ana","accepted_terms_version":"2026-10"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated',
   '{"display_name":"Beto"}');

select is((select count(*)::int from public.profiles where id in ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')), 2, 'gatilho cria um perfil por usuário');
select is((select count(*)::int from public.user_settings where profile_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')), 2, 'gatilho cria configurações');
select is((select count(*)::int from public.consents where profile_id in ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')), 2, 'termos e privacidade registrados para quem aceitou');
select is(
  (select share_amounts_with_clubs from public.user_settings
    where profile_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  false, 'valores não são compartilhados com clubes por padrão');

-- Como usuário A
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'A vê apenas o próprio perfil');
select is((select display_name from public.profiles), 'Ana', 'A vê os próprios dados');
select is_empty(
  $$ select 1 from public.user_settings where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002' $$,
  'A não lê configurações de B');
select is_empty(
  $$ update public.profiles set display_name = 'Hackeado'
       where id = 'bbbbbbbb-0000-0000-0000-000000000002' returning 1 $$,
  'A não altera o perfil de B');
select isnt_empty(
  $$ update public.profiles set display_name = 'Ana Maria'
       where id = 'aaaaaaaa-0000-0000-0000-000000000001' returning 1 $$,
  'A altera o próprio perfil');
select throws_ok(
  $$ update public.profiles set id = 'bbbbbbbb-0000-0000-0000-000000000002'
       where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'A não consegue transferir o perfil para outro id');
select throws_ok(
  $$ insert into public.consents (profile_id, type, version)
       values ('bbbbbbbb-0000-0000-0000-000000000002', 'terms', 'x') $$,
  '42501', null, 'A não registra consentimento em nome de B');
select throws_ok(
  $$ delete from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'usuário não apaga o próprio perfil direto (exclusão é função própria)');

-- Anônimo
reset role;
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anônimo não acessa perfis');
reset role;

select throws_ok(
  $$ update public.profiles set display_name = '   '
       where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '23514', null, 'nome vazio é rejeitado pela constraint');

select * from finish();
rollback;
