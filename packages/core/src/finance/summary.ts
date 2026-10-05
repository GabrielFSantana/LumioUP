import { type Cents, assertCents, percentOf } from '../money/money';
import type { Period, Transaction } from './types';
import { isValidDate } from './validation';

export interface PeriodSummary {
  income: Cents;
  expense: Cents;
  /** Aportes. */
  invested: Cents;
  redeemed: Cents;
  profit: Cents;
  loss: Cents;
  /** receitas − despesas (exclui investimentos e transferências). */
  cashFlow: Cents;
  /** aportes − resgates. */
  netInvested: Cents;
  /** lucros − perdas. */
  profitLoss: Cents;
  /** receitas − despesas − aportes + resgates: o que sobrou em caixa. */
  balance: Cents;
  /** aportes / receitas, em % com 1 casa (0 sem receita). */
  investedPercent: number;
}

export function filterByPeriod<T extends Transaction>(items: readonly T[], period: Period): T[] {
  if (!isValidDate(period.from) || !isValidDate(period.to) || period.from > period.to) {
    throw new RangeError('Período inválido.');
  }
  // Datas YYYY-MM-DD comparam corretamente como texto.
  return items.filter((t) => t.occurredOn >= period.from && t.occurredOn <= period.to);
}

/** Totais dos lançamentos informados (o chamador já filtrou o período). */
export function summarize(items: readonly Transaction[]): PeriodSummary {
  const totals = { income: 0, expense: 0, invested: 0, redeemed: 0, profit: 0, loss: 0 };
  for (const t of items) {
    assertCents(t.amountCents);
    switch (t.kind) {
      case 'income':
        totals.income += t.amountCents;
        break;
      case 'expense':
        totals.expense += t.amountCents;
        break;
      case 'investment':
        totals.invested += t.amountCents;
        break;
      case 'redemption':
        totals.redeemed += t.amountCents;
        break;
      case 'profit':
        totals.profit += t.amountCents;
        break;
      case 'loss':
        totals.loss += t.amountCents;
        break;
      case 'transfer':
        break; // movimentação interna: nunca é receita nem despesa
    }
  }
  const { income, expense, invested, redeemed, profit, loss } = totals;
  return {
    ...totals,
    cashFlow: income - expense,
    netInvested: invested - redeemed,
    profitLoss: profit - loss,
    balance: income - expense - invested + redeemed,
    investedPercent: percentOf(invested, income),
  };
}
