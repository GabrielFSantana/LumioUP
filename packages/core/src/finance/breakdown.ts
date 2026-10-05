import { type Cents, percentOf } from '../money/money';
import type { Transaction, TransactionKind } from './types';

export interface CategoryTotal {
  categoryId: string | null;
  totalCents: Cents;
  /** % do total do tipo, 1 casa decimal. */
  percent: number;
}

/** Totais por categoria para um tipo (ex.: 'expense'), do maior para o menor. */
export function totalsByCategory(
  items: readonly Transaction[],
  kind: Extract<TransactionKind, 'expense' | 'income' | 'investment'>,
): CategoryTotal[] {
  const map = new Map<string | null, Cents>();
  let grand = 0;
  for (const t of items) {
    if (t.kind !== kind) continue;
    const key = t.categoryId ?? null;
    map.set(key, (map.get(key) ?? 0) + t.amountCents);
    grand += t.amountCents;
  }
  return [...map.entries()]
    .map(([categoryId, totalCents]) => ({
      categoryId,
      totalCents,
      percent: percentOf(totalCents, grand),
    }))
    .sort(
      (a, b) =>
        b.totalCents - a.totalCents || String(a.categoryId).localeCompare(String(b.categoryId)),
    );
}

/**
 * Variação percentual (1 casa) entre dois valores.
 * Retorna null quando não há base de comparação (anterior = 0).
 */
export function percentChange(previous: Cents, current: Cents): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}
