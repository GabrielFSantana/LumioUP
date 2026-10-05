import type { Cents } from '../money/money';
import type { DateString, Transaction } from './types';

export interface AccountOpening {
  accountId: string;
  openingBalanceCents: Cents;
}

/**
 * Saldo de caixa por conta até a data (inclusive).
 * Lucros e perdas não movem caixa (são variação de valor do investimento).
 */
export function accountBalances(
  accounts: readonly AccountOpening[],
  items: readonly Transaction[],
  upTo?: DateString,
): Map<string, Cents> {
  const balances = new Map(accounts.map((a) => [a.accountId, a.openingBalanceCents]));
  const add = (id: string | null | undefined, delta: Cents) => {
    if (id != null && balances.has(id)) balances.set(id, (balances.get(id) as Cents) + delta);
  };
  for (const t of items) {
    if (upTo && t.occurredOn > upTo) continue;
    switch (t.kind) {
      case 'income':
      case 'redemption':
        add(t.accountId, t.amountCents);
        break;
      case 'expense':
      case 'investment':
        add(t.accountId, -t.amountCents);
        break;
      case 'transfer':
        add(t.accountId, -t.amountCents);
        add(t.toAccountId, t.amountCents);
        break;
      case 'profit':
      case 'loss':
        break;
    }
  }
  return balances;
}

export interface NetWorth {
  /** Dinheiro em contas (caixa). */
  cash: Cents;
  /** Valor atual dos investimentos: aportes − resgates + lucros − perdas. */
  invested: Cents;
  total: Cents;
}

/**
 * Patrimônio líquido até a data (inclusive).
 * total = saldos iniciais + receitas − despesas + lucros − perdas.
 * Aportes, resgates e transferências só movem valor entre caixa e investimentos.
 */
export function netWorth(
  accounts: readonly AccountOpening[],
  items: readonly Transaction[],
  upTo?: DateString,
): NetWorth {
  const opening = accounts.reduce((s, a) => s + a.openingBalanceCents, 0);
  let flow = 0;
  let netInvested = 0;
  let profitLoss = 0;
  for (const t of items) {
    if (upTo && t.occurredOn > upTo) continue;
    if (t.kind === 'income') flow += t.amountCents;
    else if (t.kind === 'expense') flow -= t.amountCents;
    else if (t.kind === 'investment') netInvested += t.amountCents;
    else if (t.kind === 'redemption') netInvested -= t.amountCents;
    else if (t.kind === 'profit') profitLoss += t.amountCents;
    else if (t.kind === 'loss') profitLoss -= t.amountCents;
  }
  const invested = netInvested + profitLoss;
  const cash = opening + flow - netInvested;
  return { cash, invested, total: cash + invested };
}

export interface NetWorthPoint {
  date: DateString;
  total: Cents;
  cash: Cents;
  invested: Cents;
}

/** Patrimônio líquido em cada uma das datas informadas (para o gráfico de evolução). */
export function netWorthSeries(
  accounts: readonly AccountOpening[],
  items: readonly Transaction[],
  dates: readonly DateString[],
): NetWorthPoint[] {
  return dates.map((date) => ({ date, ...netWorth(accounts, items, date) }));
}
