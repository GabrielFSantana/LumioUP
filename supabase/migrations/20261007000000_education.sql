-- Etapa 14: educação financeira (artigos, glossário, trilha, quiz, recomendação contextual).
-- Conteúdo é configuração (só leitura para o app). O que vale XP é decidido no servidor.
-- Conteúdo educativo: nunca recomenda compra ou venda de ativos.

-- ===== Conteúdo =====
create table public.articles (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  topic text not null,
  level text not null check (level in ('beginner', 'intermediate')),
  title text not null,
  summary text not null,
  -- Parágrafos separados por linha em branco; "## " abre um subtítulo; "- " abre um item de lista.
  body text not null,
  read_minutes integer not null check (read_minutes between 1 and 30),
  sort_order integer not null default 0,
  enabled boolean not null default true
);

create table public.glossary_terms (
  term text primary key,
  definition text not null,
  topic text not null,
  sort_order integer not null default 0
);

create table public.learning_tracks (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  description text not null,
  sort_order integer not null default 0
);

create table public.track_items (
  track_slug text not null references public.learning_tracks (slug) on delete cascade,
  article_slug text not null references public.articles (slug) on delete cascade,
  position integer not null check (position >= 1),
  primary key (track_slug, article_slug),
  unique (track_slug, position)
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  article_slug text not null references public.articles (slug) on delete cascade,
  position integer not null check (position >= 1),
  prompt text not null,
  options text[] not null check (array_length(options, 1) between 2 and 5),
  -- Gabarito: o app NÃO consegue ler esta coluna (só a função de correção).
  correct_index integer not null,
  explanation text not null,
  unique (article_slug, position),
  check (correct_index between 0 and array_length(options, 1) - 1)
);

-- ===== Progresso do usuário =====
create table public.article_progress (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  article_slug text not null references public.articles (slug) on delete cascade,
  completed_at timestamptz,
  quiz_best_pct integer check (quiz_best_pct between 0 and 100),
  quiz_passed_at timestamptz,
  primary key (profile_id, article_slug)
);

-- ===== XP e conquistas =====
insert into public.xp_rules (source, xp, daily_cap, label, description) values
  ('lesson_done', 15, 3, 'Artigo lido', 'Leia um artigo da área Aprender e marque como lido.'),
  ('quiz_done', 20, 3, 'Quiz aprovado', 'Acerte pelo menos 2 de 3 perguntas do quiz de um artigo.'),
  ('track_done', 50, null, 'Trilha concluída', 'Leia todos os artigos de uma trilha.');

alter table public.achievements drop constraint achievements_metric_check;
alter table public.achievements add constraint achievements_metric_check check (metric in (
  'transactions_total', 'investments_total', 'goals_created', 'goals_completed',
  'contributions_total', 'best_streak', 'level', 'articles_completed'));

insert into public.achievements (code, name, description, icon, color, metric, threshold, xp_reward, sort_order) values
  ('first_lesson', 'Primeira lição', 'Leu o primeiro artigo.', 'book-outline', 'blue', 'articles_completed', 1, 20, 120),
  ('five_lessons', 'Estudioso', 'Leu 5 artigos.', 'school-outline', 'teal', 'articles_completed', 5, 40, 130);

-- Mesma função da Etapa 11, agora também com artigos lidos.
create or replace function public.check_achievements(p_profile uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  v_tx bigint;
  v_inv bigint;
  v_goals bigint;
  v_done bigint;
  v_contrib bigint;
  v_articles bigint;
  v_best integer;
  v_level integer;
  val bigint;
  unlocked boolean;
begin
  for i in 1..3 loop
    unlocked := false;
    select count(*) into v_tx from public.transactions where profile_id = p_profile;
    select count(*) into v_inv from public.transactions
      where profile_id = p_profile and kind = 'investment';
    select count(*) into v_goals from public.goals where profile_id = p_profile;
    select count(*) into v_done from public.goals
      where profile_id = p_profile and completed_at is not null;
    select count(*) into v_contrib from public.goal_contributions
      where profile_id = p_profile and amount_cents > 0;
    select count(*) into v_articles from public.article_progress
      where profile_id = p_profile and completed_at is not null;
    select coalesce(best_streak, 0), coalesce(level, 1) into v_best, v_level
      from public.user_stats where profile_id = p_profile;

    for a in
      select * from public.achievements x
      where x.enabled and not exists (
        select 1 from public.user_achievements u where u.profile_id = p_profile and u.code = x.code)
    loop
      val := case a.metric
        when 'transactions_total' then v_tx
        when 'investments_total' then v_inv
        when 'goals_created' then v_goals
        when 'goals_completed' then v_done
        when 'contributions_total' then v_contrib
        when 'articles_completed' then v_articles
        when 'best_streak' then coalesce(v_best, 0)
        when 'level' then coalesce(v_level, 1)
      end;
      if val >= a.threshold then
        insert into public.user_achievements (profile_id, code) values (p_profile, a.code)
        on conflict do nothing;
        perform public.award_xp(p_profile, 'achievement_unlocked', null, 'achv:' || a.code, a.xp_reward);
        unlocked := true;
      end if;
    end loop;
    exit when not unlocked;
  end loop;
end;
$$;

-- ===== Funções do app =====

-- Concede o XP da trilha quando todos os artigos dela foram lidos.
create function public.check_tracks(p_profile uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t record;
begin
  for t in select slug from public.learning_tracks loop
    if exists (select 1 from public.track_items where track_slug = t.slug)
       and not exists (
         select 1 from public.track_items ti
         where ti.track_slug = t.slug and not exists (
           select 1 from public.article_progress ap
           where ap.profile_id = p_profile and ap.article_slug = ti.article_slug
             and ap.completed_at is not null)) then
      perform public.award_xp(p_profile, 'track_done', null, 'track:' || t.slug);
    end if;
  end loop;
end;
$$;

-- Marca o artigo como lido (uma vez): rende XP, conta como dia organizado e pode concluir a trilha.
create function public.complete_article(p_article text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  inserted integer;
begin
  if me is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  if not exists (select 1 from public.articles where slug = p_article and enabled) then
    raise exception 'article_not_found' using errcode = 'P0001';
  end if;

  insert into public.article_progress (profile_id, article_slug, completed_at)
  values (me, p_article, now())
  on conflict (profile_id, article_slug) do update set completed_at = now()
    where public.article_progress.completed_at is null;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;

  perform public.mark_active_day(me);
  perform public.award_xp(me, 'lesson_done', null, 'lesson:' || p_article);
  perform public.check_tracks(me);
  perform public.check_achievements(me);
end;
$$;

-- Corrige o quiz. Devolve o resultado de cada pergunta (e o gabarito só depois de responder).
-- Aprovado com 60% ou mais; o XP é concedido na primeira aprovação de cada artigo.
create function public.submit_quiz(p_article text, p_answers integer[])
returns table (question_position integer, is_correct boolean, correct_index integer, explanation text)
language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  total integer;
  right_count integer;
  pct integer;
  was_passed timestamptz;
begin
  if me is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  select count(*) into total from public.quiz_questions q
    join public.articles a on a.slug = q.article_slug and a.enabled
    where q.article_slug = p_article;
  if total = 0 then raise exception 'quiz_not_found' using errcode = 'P0001'; end if;
  if p_answers is null or array_length(p_answers, 1) is distinct from total then
    raise exception 'invalid_answers' using errcode = 'P0001';
  end if;

  select count(*)::integer into right_count
    from public.quiz_questions q
    where q.article_slug = p_article and p_answers[q.position] = q.correct_index;
  pct := (right_count * 100) / total;

  select quiz_passed_at into was_passed from public.article_progress
    where profile_id = me and article_slug = p_article;
  insert into public.article_progress (profile_id, article_slug, quiz_best_pct, quiz_passed_at)
  values (me, p_article, pct, case when pct >= 60 then now() end)
  on conflict (profile_id, article_slug) do update
    set quiz_best_pct = greatest(coalesce(public.article_progress.quiz_best_pct, 0), pct),
        quiz_passed_at = coalesce(public.article_progress.quiz_passed_at,
                                  case when pct >= 60 then now() end);

  if pct >= 60 and was_passed is null then
    perform public.mark_active_day(me);
    perform public.award_xp(me, 'quiz_done', null, 'quiz:' || p_article);
    perform public.check_achievements(me);
  end if;

  return query
    select q.position, p_answers[q.position] = q.correct_index, q.correct_index, q.explanation
    from public.quiz_questions q where q.article_slug = p_article order by q.position;
end;
$$;

-- Sugestões de leitura a partir dos registros dos últimos 30 dias. Devolve só o artigo e um motivo
-- genérico: nenhum valor sai daqui. Conteúdo educativo, não recomendação de investimento.
create function public.recommended_articles()
returns table (article_slug text, reason text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  today date := public.local_today((select auth.uid()));
  inc30 bigint;
  exp30 bigint;
  subs60 integer;
  has_invest boolean;
  has_growth boolean;
  has_goal boolean;
begin
  if me is null then raise exception 'not_allowed' using errcode = '42501'; end if;

  select coalesce(sum(amount_cents) filter (where kind = 'income'), 0),
         coalesce(sum(amount_cents) filter (where kind = 'expense'), 0)
    into inc30, exp30
    from public.transactions
    where profile_id = me and deleted_at is null and occurred_on > today - 30 and occurred_on <= today;

  select count(*)::integer into subs60
    from public.transactions t join public.categories c on c.id = t.category_id
    where t.profile_id = me and t.deleted_at is null and t.kind = 'expense'
      and c.name = 'Assinaturas' and t.occurred_on > today - 60 and t.occurred_on <= today;

  select exists (select 1 from public.transactions
    where profile_id = me and deleted_at is null and kind = 'investment') into has_invest;

  select exists (
    select 1 from (
      select category_id,
        sum(amount_cents) filter (where occurred_on > today - 30) as recent,
        sum(amount_cents) filter (where occurred_on <= today - 30) as previous
      from public.transactions
      where profile_id = me and deleted_at is null and kind = 'expense'
        and category_id is not null and occurred_on > today - 60 and occurred_on <= today
      group by category_id) g
    where g.previous > 0 and g.recent >= g.previous * 1.3) into has_growth;

  select exists (select 1 from public.goals where profile_id = me) into has_goal;

  return query
    select d.slug, d.why
    from (
      select distinct on (c.slug) c.slug, c.why, c.prio
      from (
        select 1 as prio, 'fluxo-de-caixa'::text as slug,
          'Nos últimos 30 dias, as saídas ficaram acima das entradas. Este texto ajuda a enxergar esse movimento.'::text as why
          where exp30 > inc30 and exp30 > 0
        union all
        select 2, 'despesas-recorrentes',
          'Você registrou várias assinaturas. Veja como acompanhar despesas que se repetem.'
          where subs60 >= 3
        union all
        select 3, 'risco-liquidez-diversificacao',
          'Você registrou um aporte. Entenda, em termos gerais, o que são risco e liquidez.'
          where has_invest
        union all
        select 4, 'orcamento',
          'Um dos seus gastos cresceu em relação ao período anterior. Um orçamento simples ajuda a planejar.'
          where has_growth
        union all
        select 5, 'metas-financeiras',
          'Você ainda não criou uma meta. Veja como definir objetivos financeiros.'
          where not has_goal
        union all
        select 100 + ti.position, ti.article_slug, 'Próximo passo da trilha Primeiros passos.'
          from public.track_items ti
          where ti.track_slug = 'primeiros-passos'
      ) c
      where not exists (
        select 1 from public.article_progress ap
        where ap.profile_id = me and ap.article_slug = c.slug and ap.completed_at is not null)
        and exists (select 1 from public.articles a where a.slug = c.slug and a.enabled)
      order by c.slug, c.prio
    ) d
    order by d.prio
    limit 3;
end;
$$;

-- ===== Permissões =====
revoke execute on function public.check_tracks(uuid) from public, anon, authenticated;
revoke execute on function public.complete_article(text) from public, anon;
revoke execute on function public.submit_quiz(text, integer[]) from public, anon;
revoke execute on function public.recommended_articles() from public, anon;
grant execute on function public.complete_article(text) to authenticated;
grant execute on function public.submit_quiz(text, integer[]) to authenticated;
grant execute on function public.recommended_articles() to authenticated;

alter table public.articles enable row level security;
alter table public.glossary_terms enable row level security;
alter table public.learning_tracks enable row level security;
alter table public.track_items enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.article_progress enable row level security;

create policy articles_read on public.articles for select to authenticated using (enabled);
create policy glossary_read on public.glossary_terms for select to authenticated using (true);
create policy tracks_read on public.learning_tracks for select to authenticated using (true);
create policy track_items_read on public.track_items for select to authenticated using (true);
create policy quiz_questions_read on public.quiz_questions for select to authenticated using (true);
create policy article_progress_select_own on public.article_progress
  for select to authenticated using (profile_id = (select auth.uid()));

revoke all on public.articles, public.glossary_terms, public.learning_tracks, public.track_items,
  public.quiz_questions, public.article_progress from anon, authenticated;
grant select on public.articles, public.glossary_terms, public.learning_tracks,
  public.track_items, public.article_progress to authenticated;
-- Quiz: o app lê as perguntas e opções, mas nunca o gabarito nem a explicação.
grant select (id, article_slug, position, prompt, options) on public.quiz_questions to authenticated;
