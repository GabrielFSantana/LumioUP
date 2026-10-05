import { buildReport } from './report';
import type { Transaction } from './types';

const accounts = [{ accountId: 'a', openingBalanceCents: 0 }];
const tx = (
  kind: Transaction['kind'],
  amountCents: number,
  occurredOn: string,
  categoryId?: string,
): Transaction => ({ kind, amountCents, occurredOn, accountId: 'a', categoryId });

const transactions: Transaction[] = [
  // agosto
  tx('income', 400000, '2026-08-05', 'sal'),
  tx('expense', 30000, '2026-08-10', 'food'),
  // setembro
  tx('income', 500000, '2026-09-05', 'sal'),
  tx('expense', 40000, '2026-09-10', 'food'),
  tx('expense', 20000, '2026-09-12', 'fun'),
  // outubro
  tx('income', 500000, '2026-10-05', 'sal'),
  tx('expense', 47200, '2026-10-06', 'food'),
  tx('expense', 9000, '2026-10-07', 'fun'),
  tx('expense', 23000, '2026-10-08', 'shop'),
  { ...tx('investment', 50000, '2026-10-09'), holdingId: 'h1' },
];

const base = { transactions, accounts, today: '2026-10-15', endMonth: '2026-10-15' };

describe('buildReport', () => {
  const r = buildReport({ ...base, range: '6m' });

  it('série cobre a janela escolhida terminando no mês de referência', () => {
    expect(r.series).toHaveLength(6);
    expect(r.series[0]?.label).toBe('mai');
    expect(r.series[5]?.label).toBe('out');
    expect(r.window).toEqual({ from: '2026-05-01', to: '2026-10-31' });
  });

  it('compara o mês de referência com o anterior', () => {
    expect(r.currentMonth).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(r.previousMonth).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    const expense = r.comparison.find((c) => c.key === 'expense');
    expect(expense).toMatchObject({ current: 79200, previous: 60000, changePercent: 32 });
  });

  it('lista aumentos por categoria e categorias novas', () => {
    expect(r.increases.map((c) => c.categoryId)).toEqual(['food']);
    expect(r.increases[0]?.changePercent).toBe(18);
    expect(r.newExpenseCategories.map((c) => c.categoryId)).toEqual(['shop']);
  });

  it('rankings e totais usam a janela inteira', () => {
    expect(r.topExpenses.top[0]?.categoryId).toBe('food');
    expect(r.topExpenses.top[0]?.totalCents).toBe(30000 + 40000 + 47200);
    expect(r.topIncome.top[0]?.totalCents).toBe(1400000);
    expect(r.windowTotals).toMatchObject({
      income: 1400000,
      expense: 169200,
      invested: 50000,
      profitLoss: 0,
    });
    expect(r.windowTotals.investedPercent).toBe(3.6);
  });

  it('janela do ano até o mês de referência', () => {
    const ytd = buildReport({ ...base, range: 'ytd' });
    expect(ytd.series).toHaveLength(10);
    expect(ytd.window.from).toBe('2026-01-01');
  });

  it('primeiro mês do ano compara com dezembro do ano anterior', () => {
    const jan = buildReport({ ...base, endMonth: '2026-01-10', range: 'ytd' });
    expect(jan.series).toHaveLength(1);
    expect(jan.previousMonth).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('sem lançamentos na janela fica vazio', () => {
    const empty = buildReport({ ...base, transactions: [], range: '12m' });
    expect(empty.isEmpty).toBe(true);
    expect(empty.increases).toEqual([]);
    expect(empty.windowTotals.investedPercent).toBe(0);
    expect(empty.series).toHaveLength(12);
  });
});
