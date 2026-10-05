import {
  compareSummaries,
  monthlySeries,
  newCategories,
  niceMax,
  reportMonthCount,
  shortMonthLabel,
  topIncreases,
} from './reports';
import { summarize } from './summary';
import type { Transaction } from './types';

const accounts = [{ accountId: 'a', openingBalanceCents: 100000 }];
const tx = (
  kind: Transaction['kind'],
  amountCents: number,
  occurredOn: string,
  categoryId?: string,
): Transaction => ({ kind, amountCents, occurredOn, accountId: 'a', categoryId });

describe('shortMonthLabel e reportMonthCount', () => {
  it('rótulos em português', () => {
    expect(shortMonthLabel('2026-01-15')).toBe('jan');
    expect(shortMonthLabel('2026-10-05')).toBe('out');
    expect(shortMonthLabel('2026-12-31')).toBe('dez');
  });
  it('quantidade de meses por janela', () => {
    expect(reportMonthCount('6m', '2026-10-01')).toBe(6);
    expect(reportMonthCount('12m', '2026-10-01')).toBe(12);
    expect(reportMonthCount('ytd', '2026-10-01')).toBe(10);
    expect(reportMonthCount('ytd', '2026-01-20')).toBe(1);
  });
});

describe('monthlySeries', () => {
  const items = [
    tx('income', 500000, '2026-08-05', 's'),
    tx('expense', 100000, '2026-08-10', 'f'),
    tx('income', 500000, '2026-10-05', 's'),
    tx('expense', 120000, '2026-10-08', 'f'),
    { ...tx('investment', 50000, '2026-10-09'), holdingId: 'h' },
    { ...tx('profit', 2000, '2026-10-12'), holdingId: 'h' },
  ];
  const series = monthlySeries({
    transactions: items,
    accounts,
    endMonth: '2026-10-15',
    months: 4,
    today: '2026-10-15',
  });

  it('gera um ponto por mês, do mais antigo ao mais recente', () => {
    expect(series.map((p) => p.label)).toEqual(['jul', 'ago', 'set', 'out']);
    expect(series.map((p) => p.month)).toEqual([
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
    ]);
  });

  it('resume cada mês separadamente e marca meses sem dados', () => {
    expect(series[1]).toMatchObject({ income: 500000, expense: 100000, balance: 400000 });
    expect(series[2]?.hasData).toBe(false);
    expect(series[3]).toMatchObject({
      income: 500000,
      expense: 120000,
      invested: 50000,
      profitLoss: 2000,
      investedPercent: 10,
      hasData: true,
    });
  });

  it('patrimônio acumula mês a mês e separa o investido', () => {
    expect(series[0]?.netWorth).toBe(100000);
    expect(series[1]?.netWorth).toBe(100000 + 500000 - 100000);
    expect(series[2]?.netWorth).toBe(500000);
    expect(series[3]?.netWorth).toBe(500000 + 500000 - 120000 + 2000);
    expect(series[3]?.investedValue).toBe(52000);
  });

  it('mês corrente usa hoje como data limite do patrimônio', () => {
    const early = monthlySeries({
      transactions: items,
      accounts,
      endMonth: '2026-10-15',
      months: 1,
      today: '2026-10-06',
    });
    // até 06/10 só entrou a receita de 05/10
    expect(early[0]?.netWorth).toBe(100000 + 500000 + 500000 - 100000);
  });
});

describe('compareSummaries', () => {
  const cur = summarize([tx('income', 100000, '2026-10-01'), tx('expense', 59000, '2026-10-02')]);
  const prev = summarize([tx('income', 80000, '2026-09-01'), tx('expense', 50000, '2026-09-02')]);
  it('calcula variação por linha e usa null sem base', () => {
    const rows = compareSummaries(cur, prev);
    expect(rows.map((r) => r.key)).toEqual(['income', 'expense', 'invested', 'balance']);
    expect(rows[0]?.changePercent).toBe(25);
    expect(rows[1]?.changePercent).toBe(18);
    expect(rows[2]?.changePercent).toBeNull(); // sem aportes antes
    expect(rows[3]?.current).toBe(41000);
  });
});

describe('topIncreases e newCategories', () => {
  const changes = [
    { categoryId: 'a', currentCents: 15000, previousCents: 10000, changePercent: 50 },
    { categoryId: 'b', currentCents: 5000, previousCents: 10000, changePercent: -50 },
    { categoryId: 'c', currentCents: 30000, previousCents: 20000, changePercent: 50 },
    { categoryId: 'd', currentCents: 1000, previousCents: 1000, changePercent: 0 },
  ];
  it('só aumentos, da maior diferença em valor, respeitando o limite', () => {
    expect(topIncreases(changes).map((c) => c.categoryId)).toEqual(['c', 'a']);
    expect(topIncreases(changes, 1)).toHaveLength(1);
  });
  it('categorias novas não existiam no período anterior', () => {
    const current = [
      tx('expense', 100, '2026-10-01', 'old'),
      tx('expense', 500, '2026-10-01', 'new'),
    ];
    const previous = [tx('expense', 100, '2026-09-01', 'old')];
    expect(newCategories(current, previous, 'expense').map((c) => c.categoryId)).toEqual(['new']);
  });
});

describe('niceMax', () => {
  it.each([
    [0, 100],
    [-5, 100],
    [NaN, 100],
    [1, 1],
    [3, 5],
    [7, 10],
    [11, 20],
    [48000, 50000],
    [500000, 500000],
    [500001, 1000000],
  ])('%p -> %p', (value, expected) => {
    expect(niceMax(value)).toBe(expected);
  });
});
