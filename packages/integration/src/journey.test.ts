import { addDaysIso, newClient, ok, signUpUser, todayInSaoPaulo, type TestUser } from './client';

/**
 * Jornada completa contra o Supabase LOCAL, do ponto de vista de dois usuários reais (mesmo cliente
 * do app, só com a chave pública). Cobre o caminho de ponta a ponta que os testes de banco e do
 * core cobrem em partes: cadastro → lançamentos → XP → metas → estudo → clube → desafio →
 * privacidade → exportação → exclusão da conta.
 * Requer `npx supabase start` (ou o Supabase do CI). Cada execução cria contas novas e se limpa.
 */
describe('jornada completa', () => {
  let ana: TestUser;
  let beto: TestUser;
  let clubId: string;
  let challengeId: string;
  const today = todayInSaoPaulo();

  const xpEvents = async (user: TestUser, source: string) =>
    ok(await user.client.from('xp_events').select('xp').eq('source', source), `xp ${source}`);

  const expenseSetup = async (user: TestUser) => {
    const account = ok(await user.client.from('accounts').select('id').limit(1), 'contas')[0];
    const category = ok(
      await user.client.from('categories').select('id').eq('kind', 'expense').limit(1),
      'categorias',
    )[0];
    if (!account || !category) throw new Error('Conta ou categoria padrão ausente após o cadastro');
    return { accountId: account.id as string, categoryId: category.id as string };
  };

  const addExpense = async (user: TestUser, cents: number, description = 'teste') => {
    const { accountId, categoryId } = await expenseSetup(user);
    return user.client.from('transactions').insert({
      profile_id: user.id,
      kind: 'expense',
      amount_cents: cents,
      occurred_on: today,
      account_id: accountId,
      category_id: categoryId,
      description,
    });
  };

  beforeAll(async () => {
    ana = await signUpUser('Ana Jornada');
    beto = await signUpUser('Beto Jornada');
  });

  afterAll(async () => {
    // Limpeza: quem ainda existir se apaga (a exclusão de conta também é testada abaixo).
    for (const user of [ana, beto]) {
      if (!user) continue;
      await user.client.rpc('delete_my_account');
    }
  });

  it('cadastro cria perfil, preferências, consentimentos e categorias padrão', async () => {
    const profile = ok(await ana.client.from('profiles').select('display_name').single(), 'perfil');
    expect(profile.display_name).toBe('Ana Jornada');
    const consents = ok(await ana.client.from('consents').select('type'), 'consentimentos');
    expect(consents.map((c) => c.type).sort()).toEqual(['privacy', 'terms']);
    const settings = ok(
      await ana.client
        .from('user_settings')
        .select('notif_daily_reminder, show_in_club_ranking')
        .single(),
      'preferências',
    );
    expect(settings.notif_daily_reminder).toBe(false);
    expect(settings.show_in_club_ranking).toBe(true);
    expect(
      ok(await ana.client.from('categories').select('id'), 'categorias').length,
    ).toBeGreaterThan(5);
  });

  it('lançamentos rendem XP uma vez; um lançamento idêntico não rende de novo', async () => {
    expect((await addExpense(ana, 4590, 'mercado')).error).toBeNull();
    expect((await addExpense(ana, 4590, 'mercado')).error).toBeNull(); // idêntico
    expect((await xpEvents(ana, 'transaction_created')).length).toBe(1);
    expect((await xpEvents(ana, 'active_day')).length).toBe(1);
    const stats = ok(
      await ana.client.from('user_stats').select('total_xp, current_streak').single(),
      'stats',
    );
    expect(stats.total_xp).toBeGreaterThan(0);
    expect(stats.current_streak).toBe(1);
  });

  it('o app não consegue conceder XP nem editar o próprio nível', async () => {
    const direct = await ana.client.from('xp_events').insert({
      profile_id: ana.id,
      source: 'transaction_created',
      xp: 999,
      awarded_on: today,
      idempotency_key: 'forja',
    });
    expect(direct.error).not.toBeNull();
    const stats = await ana.client
      .from('user_stats')
      .update({ total_xp: 999999 })
      .eq('profile_id', ana.id);
    expect(stats.error).not.toBeNull();
    const award = await ana.client.rpc('award_xp', {
      p_profile: ana.id,
      p_source: 'goal_completed',
      p_key: 'x',
    });
    expect(award.error).not.toBeNull();
  });

  it('meta: contribuições levam ao status concluído e ao XP da meta', async () => {
    const goal = ok(
      await ana.client
        .from('goals')
        .insert({
          profile_id: ana.id,
          name: 'Viagem',
          kind: 'trip',
          target_cents: 100000,
          deadline: addDaysIso(today, 90),
        })
        .select('id')
        .single(),
      'meta',
    );
    for (const cents of [40000, 60000]) {
      const r = await ana.client
        .from('goal_contributions')
        .insert({ profile_id: ana.id, goal_id: goal.id, amount_cents: cents, occurred_on: today });
      expect(r.error).toBeNull();
    }
    const done = ok(
      await ana.client.from('goals').select('status').eq('id', goal.id).single(),
      'status',
    );
    expect(done.status).toBe('completed');
    expect((await xpEvents(ana, 'goal_created')).length).toBe(1);
    expect((await xpEvents(ana, 'goal_completed')).length).toBe(1);
  });

  it('estudo: ler artigo e passar no quiz rendem XP; o gabarito não é legível', async () => {
    expect(
      (await ana.client.rpc('complete_article', { p_article: 'organizacao-financeira' })).error,
    ).toBeNull();
    const quiz = ok(
      await ana.client.rpc('submit_quiz', {
        p_article: 'organizacao-financeira',
        p_answers: [1, 0, 1],
      }),
      'quiz',
    ) as { is_correct: boolean }[];
    expect(quiz.every((q) => q.is_correct)).toBe(true);
    expect((await xpEvents(ana, 'lesson_done')).length).toBe(1);
    expect((await xpEvents(ana, 'quiz_done')).length).toBe(1);
    const leak = await ana.client.from('quiz_questions').select('correct_index');
    expect(leak.error).not.toBeNull();
    const recs = ok(await ana.client.rpc('recommended_articles'), 'sugestões') as {
      article_slug: string;
    }[];
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.map((r) => r.article_slug)).not.toContain('organizacao-financeira');
  });

  it('clube: entrar por código mostra só nome/nível e nunca dados financeiros', async () => {
    clubId = ok(
      await ana.client.rpc('create_club', { p_name: 'Clube Jornada', p_description: null }),
      'criar clube',
    ) as string;
    const mine = ok(await ana.client.rpc('list_my_clubs'), 'meus clubes') as {
      invite_code: string;
    }[];
    const code = (mine[0] as { invite_code: string }).invite_code;
    expect(ok(await beto.client.rpc('join_club', { p_code: code.toLowerCase() }), 'entrar')).toBe(
      clubId,
    );

    const members = ok(
      await beto.client.rpc('list_club_members', { p_club: clubId }),
      'membros',
    ) as {
      display_name: string;
      level: number | null;
    }[];
    expect(members.map((m) => m.display_name).sort()).toEqual(['Ana Jornada', 'Beto Jornada']);
    expect(members.find((m) => m.display_name === 'Ana Jornada')?.level).not.toBeNull();

    // Beto não enxerga nada financeiro de Ana, nem o perfil dela fora da função do clube.
    expect(
      ok(await beto.client.from('transactions').select('id').eq('profile_id', ana.id), 'tx de Ana'),
    ).toEqual([]);
    expect(
      ok(await beto.client.from('goals').select('id').eq('profile_id', ana.id), 'metas de Ana'),
    ).toEqual([]);
    expect(ok(await beto.client.from('profiles').select('id'), 'perfis').map((p) => p.id)).toEqual([
      beto.id,
    ]);
    // Quem está de fora não vê o clube.
    const stranger = await signUpUser('Estranha Jornada');
    expect(ok(await stranger.client.from('clubs').select('id'), 'clubes do estranho')).toEqual([]);
    expect(
      (await stranger.client.rpc('list_club_members', { p_club: clubId })).error,
    ).not.toBeNull();
    await stranger.client.rpc('delete_my_account');
  });

  it('desafio: progresso vem das ações reais e concluir rende XP', async () => {
    challengeId = ok(
      await ana.client.rpc('create_challenge', {
        p_club: clubId,
        p_kind: 'log_count',
        p_title: 'Cinco lançamentos',
        p_starts_on: today,
        p_ends_on: addDaysIso(today, 9),
        p_target: 5,
      }),
      'criar desafio',
    ) as string;
    expect(
      (await beto.client.rpc('join_challenge', { p_challenge: challengeId })).error,
    ).toBeNull();
    for (let i = 1; i <= 5; i++) expect((await addExpense(beto, 1000 + i)).error).toBeNull();

    const standings = ok(
      await ana.client.rpc('challenge_standings', { p_challenge: challengeId }),
      'placar',
    ) as {
      display_name: string;
      progress_pct: number;
      completed: boolean;
    }[];
    const b = standings.find((s) => s.display_name === 'Beto Jornada');
    expect(b?.progress_pct).toBe(100);
    expect(b?.completed).toBe(true);
    expect((await xpEvents(beto, 'challenge_done')).length).toBe(1);
    // Membro comum não cria nem apaga desafios.
    const forged = await beto.client.rpc('create_challenge', {
      p_club: clubId,
      p_kind: 'log_count',
      p_title: 'x',
      p_starts_on: today,
      p_ends_on: addDaysIso(today, 5),
      p_target: 5,
    });
    expect(forged.error).not.toBeNull();
  });

  it('ranking respeita a escolha de privacidade', async () => {
    const before = ok(
      await ana.client.rpc('club_ranking', { p_club: clubId, p_period: 'week' }),
      'ranking',
    ) as {
      display_name: string;
    }[];
    expect(before.map((r) => r.display_name)).toContain('Beto Jornada');
    expect(
      (
        await beto.client
          .from('user_settings')
          .update({ show_in_club_ranking: false })
          .eq('profile_id', beto.id)
      ).error,
    ).toBeNull();
    const after = ok(
      await ana.client.rpc('club_ranking', { p_club: clubId, p_period: 'week' }),
      'ranking 2',
    ) as {
      display_name: string;
    }[];
    expect(after.map((r) => r.display_name)).not.toContain('Beto Jornada');
    const members = ok(
      await ana.client.rpc('list_club_members', { p_club: clubId }),
      'membros',
    ) as {
      display_name: string;
      level: number | null;
    }[];
    expect(members.find((m) => m.display_name === 'Beto Jornada')?.level).toBeNull();
  });

  it('exportação traz só os dados da própria pessoa', async () => {
    const data = ok(await ana.client.rpc('export_my_data'), 'exportar') as {
      email: string;
      transactions: unknown[];
      goals: unknown[];
      clubs: unknown[];
    };
    expect(data.email).toBe(ana.email);
    expect(data.transactions.length).toBe(2);
    expect(data.goals.length).toBe(1);
    expect(data.clubs.length).toBe(1);
    const text = JSON.stringify(data);
    expect(text).not.toContain(beto.email);
    expect(text).not.toContain(beto.id);
    expect(text).not.toContain('Beto Jornada');
  });

  it('excluir a conta apaga tudo e o clube passa para quem ficou', async () => {
    expect((await ana.client.rpc('delete_my_account')).error).toBeNull();

    const login = await newClient().auth.signInWithPassword({
      email: ana.email,
      password: ana.password,
    });
    expect(login.error).not.toBeNull();

    const clubs = ok(await beto.client.rpc('list_my_clubs'), 'clubes de Beto') as {
      role: string;
      member_count: number;
    }[];
    expect(clubs).toHaveLength(1);
    expect(clubs[0]?.role).toBe('owner');
    expect(clubs[0]?.member_count).toBe(1);
    const challenges = ok(
      await beto.client.rpc('list_challenges', { p_club: clubId }),
      'desafios',
    ) as {
      id: string;
      created_by: string | null;
    }[];
    expect(challenges.find((c) => c.id === challengeId)?.created_by).toBeNull();
  });
});
