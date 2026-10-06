-- Etapa 17: endurecimento das funções do schema public.
-- Funções de gatilho só precisam rodar como gatilho (a permissão é checada ao criar o gatilho, não ao
-- disparar), então ninguém precisa de EXECUTE nelas. Antes, o acesso anônimo podia executar 8 delas.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Funções novas nascem fechadas para o acesso anônimo e para PUBLIC; cada migração concede EXECUTE
-- explicitamente a quem precisa (convenção que o projeto já seguia).
alter default privileges in schema public revoke execute on functions from public, anon;
