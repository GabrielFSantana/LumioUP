import { netWorthSeries } from './balances';
import type { Transaction } from './types';

const accounts = [{ accountId: 'a', openingBalanceCents: 100000 }];
const tx = (kind: Transaction['kind'], amountCents: number, occurredOn: string): Transaction => ({
  kind,
  amountCents,
  occurredOn,
  accountId: 'a',
});

describe('netWorthSeries', () => {
  const items = [
    tx('income', 50000, '2026-10-02'),
    tx('expense', 20000, '2026-10-04'),
    tx('investment', 30000, '2026-10-05'),
    tx('profit', 1000, '2026-10-06'),
  ];

  it('calcula o patrimônio acumulado em cada data', () => {
    const series = netWorthSeries(accounts, items, [
      '2026-10-01',
      '2026-10-03',
      '2026-10-05',
      '2026-10-06',
    ]);
    expect(series.map((p) => p.total)).toEqual([100000, 150000, 130000, 131000]);
  });

  it('aporte não muda o total, só separa caixa e investido', () => {
    const [point] = netWorthSeries(accounts, items, ['2026-10-05']);
    expect(point).toMatchObject({ total: 130000, cash: 100000, invested: 30000 });
  });

  it('sem lançamentos mantém o saldo inicial; sem datas retorna vazio', () => {
    expect(netWorthSeries(accounts, [], ['2026-10-01'])[0]?.total).toBe(100000);
    expect(netWorthSeries(accounts, items, [])).toEqual([]);
  });
});
