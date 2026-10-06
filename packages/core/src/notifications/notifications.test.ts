import {
  DAILY_TIME_OPTIONS,
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_LIMITS,
  isValidNotificationTime,
  planNotifications,
  type NotificationPrefs,
  type PlanInput,
} from './notifications';

// 2026-10-07 é uma quarta-feira.
const base = (
  over: Partial<PlanInput> = {},
  prefs: Partial<NotificationPrefs> = {},
): PlanInput => ({
  prefs: { ...DEFAULT_NOTIFICATION_PREFS, ...prefs },
  now: { date: '2026-10-07', hour: 10, minute: 0 },
  activeToday: false,
  goals: [],
  ...over,
});

const ids = (input: PlanInput) => planNotifications(input).map((n) => n.id);

describe('padrões e horários', () => {
  it('tudo começa desligado e sem agendamentos', () => {
    expect(Object.values(DEFAULT_NOTIFICATION_PREFS).filter((v) => v === true)).toEqual([]);
    expect(planNotifications(base())).toEqual([]);
  });

  it('aceita só horários entre 07:00 e 22:00', () => {
    for (const time of ['07:00', '08:30', '12:00', '21:59', '22:00']) {
      expect(isValidNotificationTime(time)).toBe(true);
    }
    for (const time of ['06:59', '03:00', '22:01', '23:00', '24:00', '8:00', '08h', '']) {
      expect(isValidNotificationTime(time)).toBe(false);
    }
    expect(DAILY_TIME_OPTIONS.every(isValidNotificationTime)).toBe(true);
  });
});

describe('lembrete diário', () => {
  const daily = { dailyReminder: true, dailyTime: '20:00' };

  it('agenda hoje e os próximos dias, no máximo 3', () => {
    expect(ids(base({}, daily))).toEqual([
      'daily:2026-10-07',
      'daily:2026-10-08',
      'daily:2026-10-09',
    ]);
    expect(NOTIFICATION_LIMITS.dailyDaysAhead).toBe(3);
  });

  it('pula hoje se o horário já passou', () => {
    const input = base({ now: { date: '2026-10-07', hour: 20, minute: 0 } }, daily);
    expect(ids(input)).toEqual(['daily:2026-10-08', 'daily:2026-10-09']);
  });

  it('não lembra hoje de quem já registrou algo', () => {
    expect(ids(base({ activeToday: true }, daily))).toEqual([
      'daily:2026-10-08',
      'daily:2026-10-09',
    ]);
  });

  it('usa o horário escolhido e ignora horário inválido', () => {
    const first = planNotifications(base({}, { dailyReminder: true, dailyTime: '08:30' }))[0];
    expect(first?.at).toEqual({ date: '2026-10-08', hour: 8, minute: 30 });
    expect(planNotifications(base({}, { dailyReminder: true, dailyTime: '03:00' }))).toEqual([]);
  });

  it('o texto é neutro e não traz valores', () => {
    const [n] = planNotifications(base({}, daily));
    expect(n?.title).toBe('Hora de registrar?');
    expect(`${n?.title} ${n?.body}`).not.toMatch(/R\$|\d{3}/);
    expect(n?.route).toBe('/lancamento-form');
  });
});

describe('missões do dia', () => {
  it('avisa às 09:00 nos próximos dias (hoje já passou)', () => {
    const plan = planNotifications(base({}, { missions: true }));
    expect(plan.map((n) => n.id)).toEqual(['missions:2026-10-08', 'missions:2026-10-09']);
    expect(plan[0]?.at).toMatchObject({ hour: 9, minute: 0 });
  });

  it('inclui hoje se ainda não deu 09:00', () => {
    const input = base({ now: { date: '2026-10-07', hour: 7, minute: 30 } }, { missions: true });
    expect(ids(input)[0]).toBe('missions:2026-10-07');
  });
});

describe('revisão semanal', () => {
  it('agenda os próximos 2 domingos às 18:00', () => {
    const plan = planNotifications(base({}, { weeklyReview: true }));
    expect(plan.map((n) => n.id)).toEqual(['weekly:2026-10-11', 'weekly:2026-10-18']);
    expect(plan[0]?.at).toEqual({ date: '2026-10-11', hour: 18, minute: 0 });
  });

  it('no domingo antes das 18:00 inclui o próprio dia', () => {
    const input = base({ now: { date: '2026-10-11', hour: 9, minute: 0 } }, { weeklyReview: true });
    expect(ids(input)).toEqual(['weekly:2026-10-11', 'weekly:2026-10-18']);
  });

  it('no domingo depois das 18:00 vai para os domingos seguintes', () => {
    const input = base(
      { now: { date: '2026-10-11', hour: 19, minute: 0 } },
      { weeklyReview: true },
    );
    expect(ids(input)).toEqual(['weekly:2026-10-18', 'weekly:2026-10-25']);
  });
});

describe('resumo do mês', () => {
  it('agenda o dia 1º do próximo mês às 09:00', () => {
    const plan = planNotifications(base({}, { monthlySummary: true }));
    expect(plan.map((n) => n.id)).toEqual(['monthly:2026-11-01']);
  });

  it('vira o ano em dezembro', () => {
    const input = base(
      { now: { date: '2026-12-15', hour: 10, minute: 0 } },
      { monthlySummary: true },
    );
    expect(ids(input)).toEqual(['monthly:2027-01-01']);
  });

  it('no dia 1º antes das 09:00 avisa no próprio dia', () => {
    const input = base(
      { now: { date: '2026-11-01', hour: 8, minute: 0 } },
      { monthlySummary: true },
    );
    expect(ids(input)).toEqual(['monthly:2026-11-01']);
  });
});

describe('metas perto do prazo', () => {
  const goals = [
    { id: 'g1', deadline: '2026-10-20' },
    { id: 'g2', deadline: '2026-10-09' },
    { id: 'g3', deadline: '2026-10-05' },
  ];

  it('avisa 3 dias antes do prazo, às 09:00, só no futuro', () => {
    const plan = planNotifications(base({ goals }, { goalDeadlines: true }));
    expect(plan.map((n) => n.id)).toEqual(['goal:g1:2026-10-20']);
    expect(plan[0]?.at).toEqual({ date: '2026-10-17', hour: 9, minute: 0 });
  });

  it('não avisa metas que já venceram nem avisa atrasado', () => {
    // g2 vence em 09/10: o aviso seria 06/10, que já passou. g3 já venceu.
    expect(ids(base({ goals }, { goalDeadlines: true }))).not.toContain('goal:g2:2026-10-09');
    expect(ids(base({ goals }, { goalDeadlines: true }))).not.toContain('goal:g3:2026-10-05');
  });

  it('o texto não revela a meta', () => {
    const [n] = planNotifications(base({ goals }, { goalDeadlines: true }));
    expect(n?.body).not.toMatch(/g1|R\$/);
  });

  it('limita a quantidade de metas', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `m${i}`, deadline: '2026-11-30' }));
    const plan = planNotifications(base({ goals: many }, { goalDeadlines: true }));
    expect(plan).toHaveLength(NOTIFICATION_LIMITS.maxGoals);
  });
});

describe('plano completo', () => {
  const all = {
    dailyReminder: true,
    weeklyReview: true,
    goalDeadlines: true,
    missions: true,
    monthlySummary: true,
  };

  it('vem em ordem cronológica e com ids únicos', () => {
    const goals = [{ id: 'g1', deadline: '2026-10-20' }];
    const plan = planNotifications(base({ goals }, all));
    const keys = plan.map(
      (n) => `${n.at.date} ${String(n.at.hour).padStart(2, '0')}:${n.at.minute}`,
    );
    expect(keys).toEqual([...keys].sort());
    expect(new Set(plan.map((n) => n.id)).size).toBe(plan.length);
  });

  it('nunca passa de um teto seguro de agendamentos', () => {
    const goals = Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, deadline: '2026-11-30' }));
    expect(planNotifications(base({ goals }, all)).length).toBeLessThanOrEqual(20);
  });

  it('só agenda coisas no futuro', () => {
    const now = { date: '2026-10-07', hour: 10, minute: 0 };
    const plan = planNotifications(
      base({ now, goals: [{ id: 'g', deadline: '2026-10-15' }] }, all),
    );
    for (const n of plan) {
      const future =
        n.at.date > now.date || (n.at.date === now.date && n.at.hour * 60 + n.at.minute > 600);
      expect(future).toBe(true);
    }
  });
});
