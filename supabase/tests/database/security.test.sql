-- Testes transversais de segurança (Etapa 17). Valem para tabelas e funções FUTURAS também:
-- se alguém criar uma tabela sem RLS ou uma função aberta demais, estes testes falham.
-- Executar com: npx supabase test db
begin;
select plan(8);

-- 1) Toda tabela do schema public tem RLS ligada.
select is_empty($$
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
$$, 'toda tabela pública tem RLS ligada');

-- 2) Funções SECURITY DEFINER fixam o search_path (evita sequestro de objetos).
select is_empty($$
  select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
$$, 'toda função SECURITY DEFINER fixa o search_path');

-- 3) Nenhuma função pública é executável pelo acesso anônimo.
select is_empty($$
  select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f' and has_function_privilege('anon', p.oid, 'execute')
$$, 'o acesso anônimo não executa nenhuma função pública');

-- 4) Funções de gatilho e internas não são executáveis por usuários logados.
select is_empty($$
  select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
    and has_function_privilege('authenticated', p.oid, 'execute')
$$, 'funções de gatilho não são executáveis por usuários logados');
select is_empty($$
  select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('award_xp', 'bump_missions', 'mark_active_day', 'check_achievements', 'check_tracks',
      'refresh_challenges', 'challenge_count', 'local_today', 'assert_join_rate', 'generate_invite_code')
    and has_function_privilege('authenticated', p.oid, 'execute')
$$, 'funções internas de XP, missões, desafios e clubes não são executáveis pelo app');

-- 5) O acesso anônimo não tem permissão em nenhuma tabela pública.
select is_empty($$
  select table_name from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon'
$$, 'o acesso anônimo não tem permissão em tabelas públicas');

-- 6) Só estas tabelas aceitam escrita direta do usuário logado; todo o resto (XP, clubes, desafios,
--    progresso, conquistas, conteúdo) só muda por funções no servidor.
select is(
  (select coalesce(array_agg(distinct table_name::text order by table_name::text), '{}')
   from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'authenticated'
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE')),
  array['accounts', 'categories', 'consents', 'goal_contributions', 'goals', 'holdings', 'profiles',
        'transactions', 'user_settings']::text[],
  'a lista de tabelas com escrita direta é a esperada');

-- 7) Ninguém apaga dados financeiros diretamente (exclusão é lógica ou por função).
select is_empty($$
  select table_name from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'DELETE'
$$, 'usuários logados não têm DELETE em nenhuma tabela pública');

select * from finish();
rollback;
