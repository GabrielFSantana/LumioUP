-- Testes de privacidade/LGPD (Etapa 16): a exportação traz só os dados da própria pessoa e a
-- exclusão da conta apaga TUDO dela sem derrubar o que pertence a outras pessoas (clubes).
-- Executar com: npx supabase test db
begin;
select plan(34);

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Ana","accepted_terms_version":"2026-10"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Beto"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Cida"}'),
  ('dddddddd-0000-0000-0000-000000000004', 'd@teste.dev', 'authenticated', 'authenticated', '{"display_name":"Davi"}');

create temp table ctx (club1 uuid, code1 text, solo uuid, club3 uuid, code3 text, ch uuid, export jsonb);
grant all on ctx to authenticated;
insert into ctx default values;

-- Dados financeiros de A e de B (o de A tem um valor facilmente reconhecível: 12345).
insert into public.transactions (profile_id, kind, amount_cents, occurred_on, account_id, category_id)
select p, 'expense', v, current_date,
  (select id from public.accounts where profile_id = p limit 1),
  (select id from public.categories where profile_id = p and kind = 'expense' limit 1)
from (values ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 12345), ('bbbbbbbb-0000-0000-0000-000000000002'::uuid, 98765)) v(p, v);
insert into public.goals (id, profile_id, name, kind, target_cents, deadline)
values ('aaaaaaaa-3333-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'Viagem', 'trip', 100000, current_date + 90);
insert into public.goal_contributions (profile_id, goal_id, amount_cents, occurred_on)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-3333-0000-0000-000000000001', 40000, current_date);

-- Clubes: A é dona do clube 1 (B entra primeiro, depois C, que vira admin) e de um clube só dela.
-- B é dono do clube 3, do qual A participa.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
update ctx set club1 = public.create_club('Clube da Ana', null);
update ctx set code1 = (select invite_code from public.clubs where id = (select club1 from ctx));
update ctx set solo = public.create_club('Só da Ana', null);
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.join_club((select code1 from ctx));
update ctx set club3 = public.create_club('Clube Azul', null);
update ctx set code3 = (select invite_code from public.clubs where id = (select club3 from ctx));
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select public.join_club((select code1 from ctx));
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.join_club((select code3 from ctx));
select public.set_member_role((select club1 from ctx), 'cccccccc-0000-0000-0000-000000000003', 'admin');
update ctx set ch = public.create_challenge((select club1 from ctx), 'log_count', 'Desafio da Ana', (now() at time zone 'America/Sao_Paulo')::date, (now() at time zone 'America/Sao_Paulo')::date + 9, 5);
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select public.join_challenge((select ch from ctx));

-- ===== Exportar (A) =====
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
update ctx set export = public.export_my_data();
select is((select export->>'app' from ctx), 'LumioUP', 'a exportação identifica o app');
select is((select export->>'email' from ctx), 'a@teste.dev', 'inclui o e-mail da própria pessoa');
select is((select jsonb_array_length(export->'transactions') from ctx), 1, 'inclui os lançamentos de A');
select is((select jsonb_array_length(export->'goals') from ctx), 1, 'inclui as metas');
select is((select jsonb_array_length(export->'goal_contributions') from ctx), 1, 'inclui as contribuições');
select is((select jsonb_array_length(export->'consents') from ctx), 2, 'inclui os consentimentos (termos e privacidade)');
select is((select jsonb_array_length(export->'accounts') from ctx) > 0, true, 'inclui as contas');
select is((select jsonb_array_length(export->'categories') from ctx) > 0, true, 'inclui as categorias');
select is((select jsonb_array_length(export->'clubs') from ctx), 3, 'lista os 3 clubes em que A participa');
select is((select export->'clubs'->0 ? 'club_name' from ctx), true, 'do clube vai o nome e o papel');
select is((select (export::text) like '%bbbbbbbb-0000%' from ctx), false, 'não vaza o id de outra pessoa');
select is((select (export::text) ~* 'Beto|Cida|b@teste|c@teste' from ctx), false, 'não vaza nome nem e-mail de outras pessoas');
select is((select (export::text) like '%98765%' from ctx), false, 'não vaza lançamentos de outra pessoa');
select is((select jsonb_array_length(export->'challenges') from ctx), 1, 'inclui a participação em desafios');

-- B exporta só o que é dele.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select jsonb_array_length(public.export_my_data()->'transactions')), 1, 'B exporta o lançamento de B');
select is(((public.export_my_data())::text) like '%12345%', false, 'B não recebe o lançamento de A');

-- ===== Não autenticado não exporta nem exclui =====
set local role anon;
select throws_ok($$ select public.export_my_data() $$, '42501', null, 'anônimo não exporta');
select throws_ok($$ select public.delete_my_account() $$, '42501', null, 'anônimo não exclui');

-- ===== Excluir a conta de A =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok($$ select public.delete_my_account() $$, 'A exclui a conta');
reset role;

select is((select count(*)::int from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'o usuário foi apagado');
select is((select count(*)::int from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0, 'o perfil foi apagado');
select lives_ok($q$
  do $d$
  declare r record; n bigint;
  begin
    for r in
      select table_name, column_name from information_schema.columns
      where table_schema = 'public' and column_name in ('profile_id', 'owner_id')
    loop
      execute format('select count(*) from public.%I where %I = %L', r.table_name, r.column_name,
        'aaaaaaaa-0000-0000-0000-000000000001') into n;
      if n > 0 then raise exception 'sobraram % linhas em %', n, r.table_name; end if;
    end loop;
  end $d$
$q$, 'nenhuma tabela guarda dados de A');
select is((select count(*)::int from public.transactions where amount_cents = 12345), 0, 'os lançamentos de A sumiram');

-- O que pertence a outras pessoas continua.
select is((select owner_id from public.clubs where id = (select club1 from ctx)), 'cccccccc-0000-0000-0000-000000000003'::uuid, 'o clube de A passou para a admin (C), e não para o membro mais antigo');
select is((select role from public.club_members where club_id = (select club1 from ctx) and profile_id = 'cccccccc-0000-0000-0000-000000000003'), 'owner', 'C virou dona');
select is((select count(*)::int from public.club_members where club_id = (select club1 from ctx)), 2, 'B e C continuam no clube');
select is((select count(*)::int from public.clubs where id = (select solo from ctx)), 0, 'o clube só de A foi apagado');
select is((select count(*)::int from public.club_members where club_id = (select club3 from ctx)), 1, 'A saiu do clube de B');
select is((select owner_id from public.clubs where id = (select club3 from ctx)), 'bbbbbbbb-0000-0000-0000-000000000002'::uuid, 'o clube de B continua de B');
select is((select count(*)::int from public.challenges where id = (select ch from ctx) and created_by is null), 1, 'o desafio criado por A continua, sem autor');
select is((select count(*)::int from public.challenge_participants where challenge_id = (select ch from ctx)), 1, 'só a participação de C permanece no desafio');
select is((select count(*)::int from public.transactions where profile_id = 'bbbbbbbb-0000-0000-0000-000000000002'), 1, 'os dados de B ficam intactos');

-- Quem não tem clube nem dados também consegue excluir.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated"}', true);
select lives_ok($$ select public.delete_my_account() $$, 'D exclui a conta');
reset role;
select is((select count(*)::int from auth.users where id = 'dddddddd-0000-0000-0000-000000000004'), 0, 'D foi apagado');

select * from finish();
rollback;
