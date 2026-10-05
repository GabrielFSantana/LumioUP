import type { Transaction } from '../finance/types';
import {
  daysUntil,
  deadlineState,
  describeDeadline,
  describeMonthlyProgress,
  isMonthlyGoal,
  monthlyGoalProgress,
  monthlyNeeded,
  savingProgress,
  validateGoalInput,
  type GoalInput,
} from './goals';

const today = '2026-10-05';

describe('savingProgress', () => {
  it('soma as contribuições e calcula o percentual para baixo', () => {
    const p = savingProgress(100000, [{ amountCents: 30000 }, { amountCents: 20000 }]);
    expect(p).toEqual({ currentCents: 50000, percent: 50, remainingCents: 50000, reached: false });
  });
  it('99,9% ainda mostra 99', () => {
    expect(savingProgress(100000, [{ amountCents: 99900 }]).percent).toBe(99);
  });
  it('retiradas reduzem; o valor atual nunca é negativo', () => {
    expect(
      savingProgress(100000, [{ amountCents: 30000 }, { amountCents: -10000 }]).currentCents,
    ).toBe(20000);
    expect(savingProgress(100000, [{ amountCents: -500 }]).currentCents).toBe(0);
  });
  it('atinge e passa do alvo: 100%, restante zero', () => {
    const p = savingProgress(100000, [{ amountCents: 100000 }, { amountCents: 5000 }]);
    expect(p).toMatchObject({ percent: 100, remainingCents: 0, reached: true });
  });
  it('sem contribuições e alvo inválido não quebram', () => {
    expect(savingProgress(100000, [])).toMatchObject({ currentCents: 0, percent: 0 });
    expect(savingProgress(0, [{ amountCents: 10 }])).toMatchObject({ percent: 0, reached: false });
  });
});

describe('daysUntil', () => {
  it('conta dias até o prazo e para trás', () => {
    expect(daysUntil('2026-10-05', today)).toBe(0);
    expect(daysUntil('2026-10-06', today)).toBe(1);
    expect(daysUntil('2026-11-04', today)).toBe(30);
    expect(daysUntil('2026-10-04', today)).toBe(-1);
    expect(daysUntil('2026-09-25', today)).toBe(-10);
  });
});

describe('deadlineState e describeDeadline', () => {
  const base = { today, reached: false };
  it('estados', () => {
    expect(deadlineState({ ...base, deadline: null })).toBe('none');
    expect(deadlineState({ ...base, deadline: '2026-12-31' })).toBe('ok');
    expect(deadlineState({ ...base, deadline: '2026-10-19' })).toBe('soon'); // 14 dias
    expect(deadlineState({ ...base, deadline: '2026-10-20' })).toBe('ok'); // 15 dias
    expect(deadlineState({ ...base, deadline: '2026-10-05' })).toBe('soon');
    expect(deadlineState({ ...base, deadline: '2026-10-04' })).toBe('overdue');
    expect(deadlineState({ ...base, deadline: '2026-10-04', reached: true })).toBe('done');
  });
  it('textos neutros', () => {
    expect(describeDeadline({ ...base, deadline: null })).toBe('Sem prazo');
    expect(describeDeadline({ ...base, deadline: '2026-10-05' })).toBe('Vence hoje');
    expect(describeDeadline({ ...base, deadline: '2026-10-06' })).toBe('Falta 1 dia');
    expect(describeDeadline({ ...base, deadline: '2026-10-15' })).toBe('Faltam 10 dias');
    expect(describeDeadline({ ...base, deadline: '2026-10-04' })).toBe('Prazo passou há 1 dia');
    expect(describeDeadline({ ...base, deadline: '2026-10-01' })).toBe('Prazo passou há 4 dias');
    expect(describeDeadline({ ...base, deadline: '2026-10-01', reached: true })).toBe(
      'Meta atingida',
    );
  });
});

describe('monthlyNeeded', () => {
  it('divide o que falta pelos meses restantes, arredondando para cima', () => {
    expect(monthlyNeeded({ remainingCents: 90000, deadline: '2027-01-03', today })).toBe(30000); // 90 dias = 3 meses
    expect(monthlyNeeded({ remainingCents: 100000, deadline: '2027-01-03', today })).toBe(33334);
  });
  it('menos de um mês conta como um mês', () => {
    expect(monthlyNeeded({ remainingCents: 5000, deadline: '2026-10-10', today })).toBe(5000);
    expect(monthlyNeeded({ remainingCents: 5000, deadline: '2026-10-05', today })).toBe(5000);
  });
  it('retorna null sem prazo, atingida ou vencida', () => {
    expect(monthlyNeeded({ remainingCents: 5000, deadline: null, today })).toBeNull();
    expect(monthlyNeeded({ remainingCents: 0, deadline: '2027-01-01', today })).toBeNull();
    expect(monthlyNeeded({ remainingCents: 5000, deadline: '2026-10-01', today })).toBeNull();
  });
});

describe('monthlyGoalProgress', () => {
  const tx = (
    kind: Transaction['kind'],
    amountCents: number,
    categoryId?: string,
  ): Transaction => ({ kind, amountCents, occurredOn: '2026-10-05', categoryId });
  const items = [
    tx('expense', 30000, 'lazer'),
    tx('expense', 20000, 'lazer'),
    tx('expense', 99999, 'outra'),
    tx('investment', 40000),
    tx('redemption', 10000),
    tx('income', 500000, 'sal'),
  ];

  it('limite de gastos soma só a categoria e sinaliza proximidade e excesso', () => {
    const goal = (target: number) => ({
      kind: 'spending_limit' as const,
      targetCents: target,
      expenseCategoryId: 'lazer',
    });
    expect(monthlyGoalProgress(goal(100000), items)).toEqual({
      valueCents: 50000,
      percent: 50,
      state: 'ok',
    });
    expect(monthlyGoalProgress(goal(60000), items).state).toBe('near'); // 83%
    expect(monthlyGoalProgress(goal(50000), items).state).toBe('over'); // 100%
    expect(monthlyGoalProgress(goal(40000), items).percent).toBe(125);
  });

  it('investir todo mês soma aportes (resgates não descontam)', () => {
    const goal = { kind: 'invest_monthly' as const, targetCents: 80000, expenseCategoryId: null };
    expect(monthlyGoalProgress(goal, items)).toEqual({
      valueCents: 40000,
      percent: 50,
      state: 'ok',
    });
    expect(monthlyGoalProgress({ ...goal, targetCents: 40000 }, items).state).toBe('done');
  });

  it('sem lançamentos fica em zero', () => {
    const goal = { kind: 'spending_limit' as const, targetCents: 1000, expenseCategoryId: 'x' };
    expect(monthlyGoalProgress(goal, [])).toEqual({ valueCents: 0, percent: 0, state: 'ok' });
  });

  it('descrições neutras', () => {
    const goal = {
      kind: 'spending_limit' as const,
      targetCents: 100000,
      expenseCategoryId: 'lazer',
    };
    expect(
      describeMonthlyProgress('spending_limit', monthlyGoalProgress(goal, items), 100000),
    ).toBe('Você usou 50% do limite deste mês.');
    expect(
      describeMonthlyProgress(
        'spending_limit',
        monthlyGoalProgress({ ...goal, targetCents: 40000 }, items),
        40000,
      ),
    ).toContain('passou do limite');
    expect(
      describeMonthlyProgress(
        'invest_monthly',
        { valueCents: 40000, percent: 50, state: 'ok' },
        80000,
      ),
    ).toBe('Você aportou R$ 400,00 de R$ 800,00 neste mês.');
  });
});

describe('isMonthlyGoal', () => {
  it('só investir todo mês e limite de gastos', () => {
    expect(isMonthlyGoal('invest_monthly')).toBe(true);
    expect(isMonthlyGoal('spending_limit')).toBe(true);
    expect(isMonthlyGoal('trip')).toBe(false);
  });
});

describe('validateGoalInput', () => {
  const valid: GoalInput = {
    kind: 'trip',
    name: 'Viagem',
    targetCents: 500000,
    deadline: '2027-01-10',
    expenseCategoryId: null,
  };
  it('aceita meta válida, com ou sem prazo', () => {
    expect(validateGoalInput(valid, today)).toBeNull();
    expect(validateGoalInput({ ...valid, deadline: null }, today)).toBeNull();
    expect(validateGoalInput({ ...valid, deadline: today }, today)).toBeNull();
  });
  it('rejeita nome vazio, valor inválido e prazo no passado ou inexistente', () => {
    expect(validateGoalInput({ ...valid, name: '  ' }, today)).not.toBeNull();
    expect(validateGoalInput({ ...valid, targetCents: 0 }, today)).not.toBeNull();
    expect(validateGoalInput({ ...valid, targetCents: 1.5 }, today)).not.toBeNull();
    expect(validateGoalInput({ ...valid, deadline: '2026-10-04' }, today)).not.toBeNull();
    expect(validateGoalInput({ ...valid, deadline: '2027-02-30' }, today)).not.toBeNull();
  });
  it('limite de gastos exige categoria e não aceita prazo', () => {
    const limit: GoalInput = {
      kind: 'spending_limit',
      name: 'Lazer',
      targetCents: 50000,
      deadline: null,
      expenseCategoryId: 'c1',
    };
    expect(validateGoalInput(limit, today)).toBeNull();
    expect(validateGoalInput({ ...limit, expenseCategoryId: null }, today)).not.toBeNull();
    expect(validateGoalInput({ ...limit, deadline: '2027-01-01' }, today)).not.toBeNull();
  });
  it('outras metas não usam categoria', () => {
    expect(validateGoalInput({ ...valid, expenseCategoryId: 'c1' }, today)).not.toBeNull();
  });
  it('investir todo mês não tem prazo', () => {
    expect(
      validateGoalInput({ ...valid, kind: 'invest_monthly', deadline: '2027-01-01' }, today),
    ).not.toBeNull();
    expect(
      validateGoalInput({ ...valid, kind: 'invest_monthly', deadline: null }, today),
    ).toBeNull();
  });
});
