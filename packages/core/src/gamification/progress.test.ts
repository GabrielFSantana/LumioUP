import {
  buildMissionRows,
  describeStreak,
  effectiveStreak,
  missionPeriodStart,
  streakState,
  summarizeAchievements,
  weekActiveIndexes,
  type MissionTemplate,
} from './progress';

const today = '2026-10-05'; // segunda-feira

describe('streakState e effectiveStreak', () => {
  it('estados', () => {
    expect(streakState({ currentStreak: 0, lastActiveOn: null, today })).toBe('none');
    expect(streakState({ currentStreak: 3, lastActiveOn: null, today })).toBe('none');
    expect(streakState({ currentStreak: 3, lastActiveOn: today, today })).toBe('active');
    expect(streakState({ currentStreak: 3, lastActiveOn: '2026-10-04', today })).toBe('at_risk');
    expect(streakState({ currentStreak: 3, lastActiveOn: '2026-10-03', today })).toBe('broken');
  });

  it('só mostra dias quando a sequência está viva', () => {
    expect(effectiveStreak({ currentStreak: 7, lastActiveOn: today, today })).toBe(7);
    expect(effectiveStreak({ currentStreak: 7, lastActiveOn: '2026-10-04', today })).toBe(7);
    expect(effectiveStreak({ currentStreak: 7, lastActiveOn: '2026-10-02', today })).toBe(0);
    expect(effectiveStreak({ currentStreak: 0, lastActiveOn: null, today })).toBe(0);
  });

  it('atravessa mês e ano', () => {
    expect(streakState({ currentStreak: 4, lastActiveOn: '2025-12-31', today: '2026-01-01' })).toBe(
      'at_risk',
    );
  });
});

describe('describeStreak', () => {
  it('mensagens neutras e sem culpa', () => {
    expect(describeStreak('none', 0)).toContain('começar');
    expect(describeStreak('active', 1)).toBe('1 dia organizado. Bom começo!');
    expect(describeStreak('active', 5)).toBe('5 dias organizados seguidos.');
    expect(describeStreak('at_risk', 5)).toBe(
      'Sua sequência de 5 dias continua se você registrar algo hoje.',
    );
    expect(describeStreak('at_risk', 1)).toContain('1 dia continua');
    expect(describeStreak('broken', 0)).toBe('Sua sequência recomeça hoje. Quando quiser!');
  });
});

describe('weekActiveIndexes', () => {
  it('marca só os dias da semana atual (domingo a sábado)', () => {
    // semana de 04/10 (dom) a 10/10 (sáb)
    const days = ['2026-10-04', '2026-10-05', '2026-10-07', '2026-10-03', '2026-10-11'];
    expect(weekActiveIndexes(days, today)).toEqual([0, 1, 3]);
  });
  it('sem atividade e datas repetidas', () => {
    expect(weekActiveIndexes([], today)).toEqual([]);
    expect(weekActiveIndexes(['2026-10-05', '2026-10-05'], today)).toEqual([1]);
  });
});

describe('missionPeriodStart', () => {
  it('diária começa hoje; semanal no domingo', () => {
    expect(missionPeriodStart('daily', today)).toBe(today);
    expect(missionPeriodStart('weekly', today)).toBe('2026-10-04');
    expect(missionPeriodStart('weekly', '2026-10-04')).toBe('2026-10-04');
    expect(missionPeriodStart('weekly', '2026-10-10')).toBe('2026-10-04');
  });
});

describe('buildMissionRows', () => {
  const templates: MissionTemplate[] = [
    {
      code: 'w',
      period: 'weekly',
      title: 'Semana',
      description: '',
      target: 5,
      xpReward: 40,
      sortOrder: 30,
    },
    {
      code: 'd2',
      period: 'daily',
      title: 'B',
      description: '',
      target: 1,
      xpReward: 10,
      sortOrder: 20,
    },
    {
      code: 'd1',
      period: 'daily',
      title: 'A',
      description: '',
      target: 2,
      xpReward: 15,
      sortOrder: 10,
    },
  ];

  it('ordena diárias antes das semanais e por ordem definida', () => {
    expect(buildMissionRows(templates, [], today).map((r) => r.template.code)).toEqual([
      'd1',
      'd2',
      'w',
    ]);
  });

  it('sem registro o progresso é zero', () => {
    const rows = buildMissionRows(templates, [], today);
    expect(rows.every((r) => r.progress === 0 && !r.completed && r.percent === 0)).toBe(true);
  });

  it('usa só o registro do período atual', () => {
    const rows = buildMissionRows(
      templates,
      [
        { templateCode: 'd1', periodStart: '2026-10-04', progress: 2, completedAt: 'x' }, // ontem
        { templateCode: 'd1', periodStart: today, progress: 1, completedAt: null },
        { templateCode: 'w', periodStart: '2026-10-04', progress: 3, completedAt: null },
        { templateCode: 'w', periodStart: '2026-09-27', progress: 5, completedAt: 'y' }, // semana passada
      ],
      today,
    );
    const by = Object.fromEntries(rows.map((r) => [r.template.code, r]));
    expect(by.d1).toMatchObject({ progress: 1, completed: false, percent: 50 });
    expect(by.w).toMatchObject({ progress: 3, completed: false, percent: 60 });
  });

  it('concluída mostra 100%; progresso acima do alvo sem conclusão fica em 99%', () => {
    const rows = buildMissionRows(
      templates,
      [
        { templateCode: 'd1', periodStart: today, progress: 2, completedAt: '2026-10-05T10:00' },
        { templateCode: 'd2', periodStart: today, progress: 5, completedAt: null },
      ],
      today,
    );
    const by = Object.fromEntries(rows.map((r) => [r.template.code, r]));
    expect(by.d1).toMatchObject({ completed: true, percent: 100 });
    expect(by.d2?.percent).toBe(99);
  });
});

describe('summarizeAchievements', () => {
  it('conta desbloqueadas dentro do catálogo', () => {
    const catalog = [{ code: 'a' }, { code: 'b' }, { code: 'c' }];
    expect(summarizeAchievements(catalog, ['a', 'c', 'zzz'])).toEqual({ unlocked: 2, total: 3 });
    expect(summarizeAchievements(catalog, [])).toEqual({ unlocked: 0, total: 3 });
  });
});
