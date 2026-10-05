import {
  accountBalances,
  filterByPeriod,
  isValidDate,
  netWorth,
  percentChange,
  summarize,
  totalsByCategory,
  validateTransaction,
  type Transaction,
} from '..';

const tx = (
  kind: Transaction['kind'],
  amountCents: number,
  extra: Partial<Transaction> = {},
): Transaction => ({ kind, amountCents, occurredOn: '2026-10-05', ...extra });

describe('isValidDate', () => {
  it.each(['2026-10-05', '2024-02-29', '2026-12-31'])('aceita %s', (d) => {
    expect(isValidDate(d)).toBe(true);
  });
  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-4-5', '05/10/2026', ''])(
    'rejeita "%s"',
    (d) => {
      expect(isValidDate(d)).toBe(false);
    },
  );
});

describe('validateTransaction', () => {
  it('aceita despesa simples', () => {
    expect(validateTransaction(tx('expense', 100))).toEqual([]);
  });
  it.each([0, -1, 1.5, NaN])('rejeita valor %p', (v) => {
    expect(validateTransaction(tx('expense', v))).not.toEqual([]);
  });
  it('rejeita data inexistente', () => {
    expect(validateTransaction(tx('income', 100, { occurredOn: '2026-02-30' }))).not.toEqual([]);
  });
  it('transferência exige origem e destino distintos', () => {
    expect(validateTransaction(tx('transfer', 100))).not.toEqual([]);
    expect(
      validateTransaction(tx('transfer', 100, { accountId: 'a', toAccountId: 'a' })),
    ).not.toEqual([]);
    expect(validateTransaction(tx('transfer', 100, { accountId: 'a', toAccountId: 'b' }))).toEqual(
      [],
    );
  });
  it('transferência não tem categoria e destino só vale em transferência', () => {
    expect(
      validateTransaction(
        tx('transfer', 100, { accountId: 'a', toAccountId: 'b', categoryId: 'c' }),
      ),
    ).not.toEqual([]);
    expect(validateTransaction(tx('expense', 100, { toAccountId: 'b' }))).not.toEqual([]);
  });
});

describe('filterByPeriod', () => {
  const items = [
    tx('expense', 1, { occurredOn: '2026-09-30' }),
    tx('expense', 2, { occurredOn: '2026-10-01' }),
    tx('expense', 3, { occurredOn: '2026-10-31' }),
    tx('expense', 4, { occurredOn: '2026-11-01' }),
  ];
  it('é inclusivo nas duas pontas', () => {
    const r = filterByPeriod(items, { from: '2026-10-01', to: '2026-10-31' });
    expect(r.map((t) => t.amountCents)).toEqual([2, 3]);
  });
  it('período de um dia', () => {
    expect(filterByPeriod(items, { from: '2026-10-01', to: '2026-10-01' })).toHaveLength(1);
  });
  it('rejeita período invertido ou inválido', () => {
    expect(() => filterByPeriod(items, { from: '2026-10-31', to: '2026-10-01' })).toThrow(
      RangeError,
    );
    expect(() => filterByPeriod(items, { from: 'x', to: '2026-10-01' })).toThrow(RangeError);
  });
});

describe('summarize', () => {
  it('lista vazia zera tudo', () => {
    expect(summarize([])).toEqual({
      income: 0,
      expense: 0,
      invested: 0,
      redeemed: 0,
      profit: 0,
      loss: 0,
      cashFlow: 0,
      netInvested: 0,
      profitLoss: 0,
      balance: 0,
      investedPercent: 0,
    });
  });

  it('calcula cenário completo', () => {
    const s = summarize([
      tx('income', 500000),
      tx('expense', 120050),
      tx('expense', 30000),
      tx('investment', 100000),
      tx('redemption', 20000),
      tx('profit', 5000),
      tx('loss', 1500),
    ]);
    expect(s.income).toBe(500000);
    expect(s.expense).toBe(150050);
    expect(s.cashFlow).toBe(349950);
    expect(s.netInvested).toBe(80000);
    expect(s.profitLoss).toBe(3500);
    expect(s.balance).toBe(500000 - 150050 - 100000 + 20000);
    expect(s.investedPercent).toBe(20);
  });

  it('transferência não é receita nem despesa', () => {
    const s = summarize([tx('transfer', 99999, { accountId: 'a', toAccountId: 'b' })]);
    expect(s.income).toBe(0);
    expect(s.expense).toBe(0);
    expect(s.balance).toBe(0);
  });

  it('lucros e perdas não alteram o saldo de caixa', () => {
    const s = summarize([tx('income', 1000), tx('profit', 500), tx('loss', 200)]);
    expect(s.balance).toBe(1000);
    expect(s.profitLoss).toBe(300);
  });

  it('saldo pode ser negativo', () => {
    expect(summarize([tx('expense', 5000), tx('income', 1000)]).balance).toBe(-4000);
  });

  it('% investido é 0 sem receita, mesmo com aportes', () => {
    expect(summarize([tx('investment', 1000)]).investedPercent).toBe(0);
  });

  it('centavos não sofrem erro de ponto flutuante', () => {
    const items = Array.from({ length: 10 }, () => tx('expense', 10));
    expect(summarize(items).expense).toBe(100);
  });

  it('rejeita valores não inteiros', () => {
    expect(() => summarize([tx('expense', 1.5)])).toThrow(RangeError);
  });
});

describe('accountBalances', () => {
  const accounts = [
    { accountId: 'carteira', openingBalanceCents: 10000 },
    { accountId: 'banco', openingBalanceCents: 50000 },
  ];

  it('aplica receitas, despesas, aportes e resgates', () => {
    const b = accountBalances(accounts, [
      tx('income', 20000, { accountId: 'banco' }),
      tx('expense', 5000, { accountId: 'carteira' }),
      tx('investment', 10000, { accountId: 'banco' }),
      tx('redemption', 3000, { accountId: 'banco' }),
    ]);
    expect(b.get('banco')).toBe(50000 + 20000 - 10000 + 3000);
    expect(b.get('carteira')).toBe(5000);
  });

  it('transferência move saldo e preserva o total', () => {
    const b = accountBalances(accounts, [
      tx('transfer', 4000, { accountId: 'banco', toAccountId: 'carteira' }),
    ]);
    expect(b.get('banco')).toBe(46000);
    expect(b.get('carteira')).toBe(14000);
    expect([...b.values()].reduce((s, v) => s + v, 0)).toBe(60000);
  });

  it('respeita a data limite e ignora lucro/perda', () => {
    const b = accountBalances(
      accounts,
      [
        tx('income', 1000, { accountId: 'banco', occurredOn: '2026-10-01' }),
        tx('income', 9000, { accountId: 'banco', occurredOn: '2026-10-20' }),
        tx('profit', 777, { accountId: 'banco', occurredOn: '2026-10-01' }),
      ],
      '2026-10-10',
    );
    expect(b.get('banco')).toBe(51000);
  });

  it('ignora contas desconhecidas', () => {
    const b = accountBalances(accounts, [tx('income', 100, { accountId: 'fantasma' })]);
    expect(b.size).toBe(2);
  });
});

describe('netWorth', () => {
  const accounts = [{ accountId: 'a', openingBalanceCents: 100000 }];

  it('sem lançamentos = saldo inicial', () => {
    expect(netWorth(accounts, [])).toEqual({ cash: 100000, invested: 0, total: 100000 });
  });

  it('aporte não altera o patrimônio, só move caixa para investido', () => {
    const r = netWorth(accounts, [tx('investment', 30000)]);
    expect(r).toEqual({ cash: 70000, invested: 30000, total: 100000 });
  });

  it('lucro aumenta e perda reduz o patrimônio', () => {
    const r = netWorth(accounts, [tx('investment', 30000), tx('profit', 2000), tx('loss', 500)]);
    expect(r.invested).toBe(31500);
    expect(r.total).toBe(101500);
  });

  it('resgate total com lucro devolve tudo ao caixa', () => {
    const r = netWorth(accounts, [
      tx('investment', 10000),
      tx('profit', 1000),
      tx('redemption', 11000),
    ]);
    expect(r).toEqual({ cash: 101000, invested: 0, total: 101000 });
  });

  it('receitas e despesas alteram o patrimônio; transferência não', () => {
    const r = netWorth(accounts, [
      tx('income', 5000),
      tx('expense', 2000),
      tx('transfer', 99999, { accountId: 'a', toAccountId: 'b' }),
    ]);
    expect(r.total).toBe(103000);
  });

  it('respeita a data limite', () => {
    const r = netWorth(
      accounts,
      [
        tx('income', 1000, { occurredOn: '2026-01-01' }),
        tx('income', 9000, { occurredOn: '2026-12-01' }),
      ],
      '2026-06-30',
    );
    expect(r.total).toBe(101000);
  });
});

describe('totalsByCategory', () => {
  const items = [
    tx('expense', 3000, { categoryId: 'alimentacao' }),
    tx('expense', 1000, { categoryId: 'alimentacao' }),
    tx('expense', 4000, { categoryId: 'transporte' }),
    tx('expense', 2000),
    tx('income', 99999, { categoryId: 'salario' }),
  ];

  it('agrupa, ordena e calcula percentual', () => {
    const r = totalsByCategory(items, 'expense');
    expect(r.map((c) => [c.categoryId, c.totalCents, c.percent])).toEqual([
      ['alimentacao', 4000, 40],
      ['transporte', 4000, 40],
      [null, 2000, 20],
    ]);
  });

  it('sem lançamentos do tipo retorna lista vazia', () => {
    expect(totalsByCategory([], 'income')).toEqual([]);
  });
});

describe('percentChange', () => {
  it('aumento e queda', () => {
    expect(percentChange(10000, 11800)).toBe(18);
    expect(percentChange(10000, 7500)).toBe(-25);
  });
  it('sem base de comparação retorna null', () => {
    expect(percentChange(0, 500)).toBeNull();
  });
  it('sem variação é 0', () => {
    expect(percentChange(500, 500)).toBe(0);
  });
});
