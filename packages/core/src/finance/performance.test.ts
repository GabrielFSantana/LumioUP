import { buildDashboard } from './dashboard';
import { monthlySeries } from './reports';
import type { PeriodKind } from './periods';
import type { Transaction } from './types';

/**
 * Desempenho dos cálculos do dashboard com muitos lançamentos (critério: tela em < 2 s com 5.000).
 * Os limites são folgados de propósito (dezenas de vezes acima do medido) para não oscilar em CI;
 * o objetivo é pegar regressões grosseiras, como um cálculo que vira quadrático.
 */
const TODAY = '2026-10-06';
const ACCOUNTS = [
  { accountId: 'a1', openingBalanceCents: 100_000 },
  { accountId: 'a2', openingBalanceCents: 0 },
  { accountId: 'a3', openingBalanceCents: 50_000 },
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Datas dos últimos ~2 anos, de forma determinística. */
function dateAt(offset: number): string {
  const d = new Date(Date.UTC(2026, 9, 6 - (offset % 700)));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function makeTransactions(count: number): Transaction[] {
  return Array.from({ length: count }, (_, i): Transaction => {
    const income = i % 10 === 0;
    const transfer = i % 17 === 0;
    return {
      id: `t${i}`,
      kind: transfer ? 'transfer' : income ? 'income' : 'expense',
      amountCents: income ? 300_000 : 500 + ((i * 37) % 40_000),
      occurredOn: dateAt(i),
      accountId: ACCOUNTS[i % 3]?.accountId ?? 'a1',
      toAccountId: transfer ? 'a2' : null,
      categoryId: `c${i % 12}`,
    };
  });
}

function time<T>(fn: () => T): { ms: number; value: T } {
  const start = performance.now();
  const value = fn();
  return { ms: performance.now() - start, value };
}

describe.each([5_000, 20_000])('dashboard com %i lançamentos', (count) => {
  const transactions = makeTransactions(count);

  it.each<PeriodKind>(['day', 'week', 'month', 'year'])('período %s calcula rápido', (kind) => {
    const { ms, value } = time(() =>
      buildDashboard({
        kind,
        anchor: TODAY,
        today: TODAY,
        transactions,
        accounts: ACCOUNTS,
        categoryName: (id) => id ?? undefined,
      }),
    );
    expect(value.summary).toBeDefined();
    expect(ms).toBeLessThan(count === 5_000 ? 500 : 2_000);
  });

  it('série mensal de 24 meses calcula rápido', () => {
    const { ms, value } = time(() =>
      monthlySeries({
        transactions,
        accounts: ACCOUNTS,
        endMonth: TODAY,
        months: 24,
        today: TODAY,
      }),
    );
    expect(value).toHaveLength(24);
    expect(ms).toBeLessThan(count === 5_000 ? 500 : 2_000);
  });
});
