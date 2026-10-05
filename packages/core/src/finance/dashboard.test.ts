import { buildDashboard } from './dashboard';
import type { Transaction } from './types';

const accounts = [{ accountId: 'a', openingBalanceCents: 100000 }];
const names: Record<string, string> = { food: 'Alimentação', salary: 'Salário' };
const categoryName = (id: string | null) => (id ? names[id] : undefined);

const tx = (
  kind: Transaction['kind'],
  amountCents: number,
  occurredOn: string,
  categoryId?: string,
): Transaction => ({ kind, amountCents, occurredOn, accountId: 'a', categoryId });

const today = '2026-10-15';
const transactions: Transaction[] = [
  // setembro (mês anterior)
  tx('income', 300000, '2026-09-05', 'salary'),
  tx('expense', 10000, '2026-09-10', 'food'),
  // outubro
  tx('income', 300000, '2026-10-05', 'salary'),
  tx('expense', 11800, '2026-10-08', 'food'),
  tx('investment', 30000, '2026-10-09'),
];
transactions[4] = { ...transactions[4]!, holdingId: 'h1' };

const base = { today, transactions, accounts, categoryName };

describe('buildDashboard (mês)', () => {
  const d = buildDashboard({ ...base, kind: 'month', anchor: '2026-10-15' });

  it('resolve período, anterior e rótulo', () => {
    expect(d.period).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(d.previous).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(d.label).toBe('Outubro de 2026');
  });

  it('resume apenas o período escolhido', () => {
    expect(d.summary.income).toBe(300000);
    expect(d.summary.expense).toBe(11800);
    expect(d.summary.invested).toBe(30000);
    expect(d.summary.investedPercent).toBe(10);
    expect(d.previousSummary.expense).toBe(10000);
    expect(d.isEmpty).toBe(false);
  });

  it('ranqueia categorias e gera frases neutras', () => {
    expect(d.topExpenses.top[0]?.categoryId).toBe('food');
    expect(d.topIncome.top[0]?.categoryId).toBe('salary');
    expect(d.insights[0]).toBe(
      'Seus gastos com Alimentação aumentaram 18% em relação ao mês anterior.',
    );
    expect(d.insights[1]).toBe('Você investiu 10% da sua renda neste período.');
  });

  it('patrimônio considera o histórico completo e limita a série a hoje', () => {
    // 100.000 + 300.000 - 10.000 + 300.000 - 11.800 = 678.200 (aporte não altera o total)
    expect(d.netWorthNow.total).toBe(678200);
    expect(d.netWorthNow.invested).toBe(30000);
    const last = d.netWorthSeries[d.netWorthSeries.length - 1];
    expect(last?.date).toBe(today);
    expect(d.netWorthSeries[0]?.date).toBe('2026-10-01');
    expect(d.netWorthChangeCents).toBe(678200 - 390000);
  });
});

describe('buildDashboard (outros períodos)', () => {
  it('dia sem lançamentos fica vazio e sem comparação', () => {
    const d = buildDashboard({ ...base, kind: 'day', anchor: '2026-10-14' });
    expect(d.isEmpty).toBe(true);
    expect(d.insights).toEqual([]);
    expect(d.netWorthChangeCents).toBeNull();
    expect(d.netWorthSeries).toHaveLength(1);
  });

  it('semana inclui só os dias da semana de domingo a sábado', () => {
    const d = buildDashboard({ ...base, kind: 'week', anchor: '2026-10-08' });
    expect(d.period).toEqual({ from: '2026-10-04', to: '2026-10-10' });
    expect(d.summary.income).toBe(300000);
    expect(d.summary.expense).toBe(11800);
  });

  it('ano soma o ano inteiro', () => {
    const d = buildDashboard({ ...base, kind: 'year', anchor: '2026-10-15' });
    expect(d.summary.income).toBe(600000);
    expect(d.summary.expense).toBe(21800);
  });

  it('personalizado usa o intervalo informado e o equivalente imediatamente anterior', () => {
    const d = buildDashboard({
      ...base,
      kind: 'custom',
      anchor: '2026-10-15',
      custom: { from: '2026-10-01', to: '2026-10-10' },
    });
    expect(d.previous).toEqual({ from: '2026-09-21', to: '2026-09-30' });
    expect(d.summary.expense).toBe(11800);
    expect(d.previousSummary.expense).toBe(0); // a despesa de setembro foi no dia 10, fora da janela
  });

  it('período futuro não tem pontos de patrimônio e usa o saldo de hoje', () => {
    const d = buildDashboard({ ...base, kind: 'month', anchor: '2026-12-01' });
    expect(d.netWorthSeries).toEqual([]);
    expect(d.isEmpty).toBe(true);
  });

  it('personalizado inválido (início depois do fim) lança erro', () => {
    expect(() =>
      buildDashboard({
        ...base,
        kind: 'custom',
        anchor: '2026-10-15',
        custom: { from: '2026-10-20', to: '2026-10-01' },
      }),
    ).toThrow(RangeError);
  });

  it('sem nenhum dado ainda mostra zeros', () => {
    const d = buildDashboard({
      today,
      transactions: [],
      accounts,
      categoryName,
      kind: 'month',
      anchor: today,
    });
    expect(d.summary.balance).toBe(0);
    expect(d.netWorthNow.total).toBe(100000);
    expect(d.isEmpty).toBe(true);
  });
});
