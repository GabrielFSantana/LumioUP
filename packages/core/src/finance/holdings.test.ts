import {
  positionEffect,
  summarizeHoldings,
  totalInvestments,
  validateInvestmentMove,
} from './holdings';
import type { Transaction } from './types';
import { isInvestmentKind, validateTransaction } from './validation';

const tx = (
  kind: Transaction['kind'],
  amountCents: number,
  holdingId: string | null = 'h1',
): Transaction => ({
  kind,
  amountCents,
  occurredOn: '2026-10-05',
  accountId: 'a',
  holdingId,
});

describe('summarizeHoldings', () => {
  it('calcula valor atual e rendimento por posição', () => {
    const map = summarizeHoldings([
      tx('investment', 100000),
      tx('profit', 5000),
      tx('loss', 1000),
      tx('redemption', 20000),
      tx('investment', 50000, 'h2'),
    ]);
    const h1 = map.get('h1');
    expect(h1?.contributed).toBe(100000);
    expect(h1?.redeemed).toBe(20000);
    expect(h1?.profitLoss).toBe(4000);
    expect(h1?.currentValue).toBe(84000);
    expect(h1?.returnPercent).toBe(4);
    expect(map.get('h2')?.currentValue).toBe(50000);
  });

  it('rendimento é null sem aportes e valor pode ser zero', () => {
    const map = summarizeHoldings([tx('profit', 500)]);
    expect(map.get('h1')?.returnPercent).toBeNull();
    const zero = summarizeHoldings([tx('investment', 1000), tx('redemption', 1000)]);
    expect(zero.get('h1')?.currentValue).toBe(0);
  });

  it('resgate total com lucro zera a posição', () => {
    const map = summarizeHoldings([
      tx('investment', 10000),
      tx('profit', 1000),
      tx('redemption', 11000),
    ]);
    expect(map.get('h1')?.currentValue).toBe(0);
  });

  it('ignora lançamentos sem posição e aceita lista vazia', () => {
    expect(summarizeHoldings([tx('expense', 100, null)]).size).toBe(0);
    expect(summarizeHoldings([]).size).toBe(0);
  });

  it('prejuízo gera rendimento negativo', () => {
    const map = summarizeHoldings([tx('investment', 10000), tx('loss', 1500)]);
    expect(map.get('h1')?.returnPercent).toBe(-15);
    expect(map.get('h1')?.currentValue).toBe(8500);
  });
});

describe('positionEffect', () => {
  it('aporte e lucro aumentam a posição; resgate e perda diminuem', () => {
    expect(positionEffect('investment')).toBe(1);
    expect(positionEffect('profit')).toBe(1);
    expect(positionEffect('redemption')).toBe(-1);
    expect(positionEffect('loss')).toBe(-1);
  });
  it('outros tipos não afetam posições', () => {
    expect(positionEffect('expense')).toBe(0);
    expect(positionEffect('transfer')).toBe(0);
  });
  it('a soma dos efeitos bate com o valor atual', () => {
    const items = [
      tx('investment', 100000),
      tx('profit', 2500),
      tx('redemption', 30000),
      tx('loss', 500),
    ];
    const sum = items.reduce((s, t) => s + positionEffect(t.kind) * t.amountCents, 0);
    expect(sum).toBe(summarizeHoldings(items).get('h1')?.currentValue);
  });
});

describe('totalInvestments', () => {
  it('soma as posições', () => {
    const map = summarizeHoldings([
      tx('investment', 100000),
      tx('profit', 10000),
      tx('investment', 100000, 'h2'),
      tx('loss', 5000, 'h2'),
    ]);
    const total = totalInvestments(map.values());
    expect(total.contributed).toBe(200000);
    expect(total.profitLoss).toBe(5000);
    expect(total.currentValue).toBe(205000);
    expect(total.returnPercent).toBe(2.5);
  });
  it('vazio retorna zeros e rendimento null', () => {
    expect(totalInvestments([])).toEqual({
      contributed: 0,
      currentValue: 0,
      profitLoss: 0,
      returnPercent: null,
    });
  });
});

describe('validateInvestmentMove', () => {
  it('bloqueia resgate e perda acima do valor atual', () => {
    expect(validateInvestmentMove('redemption', 10001, 10000)).toContain('maior');
    expect(validateInvestmentMove('loss', 10001, 10000)).toContain('maior');
  });
  it('aceita até o valor atual e outros tipos', () => {
    expect(validateInvestmentMove('redemption', 10000, 10000)).toBeNull();
    expect(validateInvestmentMove('loss', 1, 10000)).toBeNull();
    expect(validateInvestmentMove('investment', 999999, 0)).toBeNull();
    expect(validateInvestmentMove('profit', 999999, 0)).toBeNull();
  });
});

describe('regras de posição em validateTransaction', () => {
  it('movimentos de investimento exigem posição', () => {
    expect(validateTransaction(tx('investment', 100, null))).not.toEqual([]);
    expect(validateTransaction(tx('investment', 100, 'h1'))).toEqual([]);
  });
  it('outros tipos não aceitam posição', () => {
    expect(validateTransaction(tx('expense', 100, 'h1'))).not.toEqual([]);
    expect(validateTransaction(tx('expense', 100, null))).toEqual([]);
  });
  it('isInvestmentKind', () => {
    expect(isInvestmentKind('profit')).toBe(true);
    expect(isInvestmentKind('transfer')).toBe(false);
  });
});
