-- Etapa 16: privacidade e LGPD — exportar dados e excluir a conta.
-- Tudo roda como a própria pessoa (auth.uid()): ninguém exporta nem apaga dados de outra pessoa.

-- ===== Exportar meus dados =====
-- Devolve um JSON só com os dados da própria pessoa. De clubes e desafios saem apenas a participação
-- dela (nome do clube, papel, datas), nunca dados de outros membros.
create function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  return jsonb_build_object(
    'app', 'LumioUP',
    'format_version', 1,
    'exported_at', now(),
    'email', (select u.email from auth.users u where u.id = me),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = me),
    'settings', (select to_jsonb(s) from public.user_settings s where s.profile_id = me),
    'consents', coalesce((select jsonb_agg(to_jsonb(c) order by c.accepted_at)
      from public.consents c where c.profile_id = me), '[]'::jsonb),
    'accounts', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at)
      from public.accounts a where a.profile_id = me), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order, c.name)
      from public.categories c where c.profile_id = me), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t) order by t.occurred_on, t.created_at)
      from public.transactions t where t.profile_id = me), '[]'::jsonb),
    'holdings', coalesce((select jsonb_agg(to_jsonb(h) order by h.created_at)
      from public.holdings h where h.profile_id = me), '[]'::jsonb),
    'goals', coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at)
      from public.goals g where g.profile_id = me), '[]'::jsonb),
    'goal_contributions', coalesce((select jsonb_agg(to_jsonb(c) order by c.occurred_on, c.created_at)
      from public.goal_contributions c where c.profile_id = me), '[]'::jsonb),
    'xp_events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at)
      from public.xp_events e where e.profile_id = me), '[]'::jsonb),
    'stats', (select to_jsonb(s) from public.user_stats s where s.profile_id = me),
    'activity_days', coalesce((select jsonb_agg(d.day order by d.day)
      from public.activity_days d where d.profile_id = me), '[]'::jsonb),
    'missions', coalesce((select jsonb_agg(to_jsonb(m) order by m.period_start)
      from public.user_missions m where m.profile_id = me), '[]'::jsonb),
    'achievements', coalesce((select jsonb_agg(to_jsonb(a) order by a.unlocked_at)
      from public.user_achievements a where a.profile_id = me), '[]'::jsonb),
    'learning', coalesce((select jsonb_agg(to_jsonb(p) order by p.article_slug)
      from public.article_progress p where p.profile_id = me), '[]'::jsonb),
    'clubs', coalesce((select jsonb_agg(jsonb_build_object(
        'club_name', c.name, 'role', m.role, 'joined_at', m.joined_at) order by m.joined_at)
      from public.club_members m join public.clubs c on c.id = m.club_id
      where m.profile_id = me), '[]'::jsonb),
    'challenges', coalesce((select jsonb_agg(jsonb_build_object(
        'title', c.title, 'kind', c.kind, 'starts_on', c.starts_on, 'ends_on', c.ends_on,
        'target', c.target, 'joined_on', p.joined_on, 'completed_at', p.completed_at)
        order by c.starts_on)
      from public.challenge_participants p join public.challenges c on c.id = p.challenge_id
      where p.profile_id = me), '[]'::jsonb)
  );
end;
$$;

-- ===== Excluir a conta =====
-- Apaga o usuário; todo o resto sai em cascata (e a lista de tabelas é conferida nos testes).
-- Exceção: clubes que a pessoa possui. Se há outros membros, a propriedade passa para o admin mais
-- antigo (ou, sem admin, o membro mais antigo), para a exclusão nunca derrubar o clube dos outros;
-- se ela era a única pessoa, o clube é apagado.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  c record;
  heir uuid;
begin
  if me is null then raise exception 'not_allowed' using errcode = '42501'; end if;

  for c in select id from public.clubs where owner_id = me loop
    select m.profile_id into heir
      from public.club_members m
      where m.club_id = c.id and m.profile_id <> me
      order by (m.role = 'admin') desc, m.joined_at, m.profile_id
      limit 1;
    if heir is null then
      delete from public.clubs where id = c.id;
    else
      delete from public.club_members where club_id = c.id and profile_id = me;
      update public.club_members set role = 'owner' where club_id = c.id and profile_id = heir;
      update public.clubs set owner_id = heir where id = c.id;
    end if;
  end loop;

  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
