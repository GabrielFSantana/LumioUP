import { type Cents, formatBRL } from '../money/money';
import type { Transaction, TransactionKind } from './types';

export type InvestmentKind = 'investment' | 'redemption' | 'profit' | 'loss';

export const INVESTMENT_KIND_LABELS: Record<InvestmentKind, string> = {
  investment: 'Aporte',
  redemption: 'Resgate',
  profit: 'Lucro',
  loss: 'Perda',
};

/**
 * Efeito do movimento sobre o VALOR DA POSIÇÃO (não sobre o caixa):
 * aporte e lucro aumentam; resgate e perda diminuem. Para a visão de caixa use `displaySign`.
 */
export function positionEffect(kind: TransactionKind): 1 | -1 | 0 {
  switch (kind) {
    case 'investment':
    case 'profit':
      return 1;
    case 'redemption':
    case 'loss':
      return -1;
    default:
      return 0;
  }
}

export interface HoldingSummary {
  holdingId: string;
  /** Total aportado. */
  contributed: Cents;
  redeemed: Cents;
  profit: Cents;
  loss: Cents;
  /** aportes - resgates + lucros - perdas. */
  currentValue: Cents;
  /** lucros - perdas. */
  profitLoss: Cents;
  /** (lucros - perdas) / total aportado, em % com 1 casa; null se nunca houve aporte. */
  returnPercent: number | null;
}

/** Resumo por posição; ignora lançamentos sem posição. */
export function summarizeHoldings(items: readonly Transaction[]): Map<string, HoldingSummary> {
  const map = new Map<string, HoldingSummary>();
  for (const t of items) {
    if (!t.holdingId) continue;
    let s = map.get(t.holdingId);
    if (!s) {
      s = {
        holdingId: t.holdingId,
        contributed: 0,
        redeemed: 0,
        profit: 0,
        loss: 0,
        currentValue: 0,
        profitLoss: 0,
        returnPercent: null,
      };
      map.set(t.holdingId, s);
    }
    if (t.kind === 'investment') s.contributed += t.amountCents;
    else if (t.kind === 'redemption') s.redeemed += t.amountCents;
    else if (t.kind === 'profit') s.profit += t.amountCents;
    else if (t.kind === 'loss') s.loss += t.amountCents;
  }
  for (const s of map.values()) {
    s.profitLoss = s.profit - s.loss;
    s.currentValue = s.contributed - s.redeemed + s.profitLoss;
    s.returnPercent =
      s.contributed > 0 ? Math.round((s.profitLoss / s.contributed) * 1000) / 10 : null;
  }
  return map;
}

export interface InvestmentTotals {
  contributed: Cents;
  currentValue: Cents;
  profitLoss: Cents;
  returnPercent: number | null;
}

export function totalInvestments(summaries: Iterable<HoldingSummary>): InvestmentTotals {
  let contributed = 0;
  let currentValue = 0;
  let profitLoss = 0;
  for (const s of summaries) {
    contributed += s.contributed;
    currentValue += s.currentValue;
    profitLoss += s.profitLoss;
  }
  return {
    contributed,
    currentValue,
    profitLoss,
    returnPercent: contributed > 0 ? Math.round((profitLoss / contributed) * 1000) / 10 : null,
  };
}

/**
 * Proteção do app: resgate e perda não podem passar do valor atual da posição.
 * Retorna mensagem (pt-BR) ou null se o movimento é aceitável.
 */
export function validateInvestmentMove(
  kind: TransactionKind,
  amountCents: Cents,
  currentValue: Cents,
): string | null {
  if (kind === 'redemption' && amountCents > currentValue) {
    return `O resgate é maior que o valor atual da posição (${formatBRL(currentValue)}). Se ela rendeu, registre o lucro antes.`;
  }
  if (kind === 'loss' && amountCents > currentValue) {
    return `A perda é maior que o valor atual da posição (${formatBRL(currentValue)}).`;
  }
  return null;
}
