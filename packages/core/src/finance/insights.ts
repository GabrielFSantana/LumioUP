import { type Cents, percentOf } from '../money/money';
import { type CategoryTotal, percentChange, totalsByCategory } from './breakdown';
import type { PeriodSummary } from './summary';
import type { Transaction, TransactionKind } from './types';

type CategoryReportKind = Extract<TransactionKind, 'expense' | 'income' | 'investment'>;

export interface TopCategories {
  top: CategoryTotal[];
  /** Soma das categorias que ficaram fora do ranking. */
  otherCents: Cents;
  otherPercent: number;
}

/** Maiores categorias de um tipo; o restante vira "outras". */
export function topCategories(
  items: readonly Transaction[],
  kind: CategoryReportKind,
  limit = 5,
): TopCategories {
  const all = totalsByCategory(items, kind);
  const top = all.slice(0, limit);
  const otherCents = all.slice(limit).reduce((sum, c) => sum + c.totalCents, 0);
  const grand = all.reduce((sum, c) => sum + c.totalCents, 0);
  return { top, otherCents, otherPercent: percentOf(otherCents, grand) };
}

export interface CategoryChange {
  categoryId: string | null;
  currentCents: Cents;
  previousCents: Cents;
  /** Variação percentual com 1 casa (quando há base de comparação). */
  changePercent: number;
}

/**
 * Variação por categoria entre dois períodos. Só entram categorias com valor no período
 * anterior (sem base não existe percentual). Ordenado pela maior diferença em valor.
 */
export function categoryChanges(
  current: readonly Transaction[],
  previous: readonly Transaction[],
  kind: CategoryReportKind,
): CategoryChange[] {
  const now = new Map(totalsByCategory(current, kind).map((c) => [c.categoryId, c.totalCents]));
  const before = totalsByCategory(previous, kind);
  const changes: CategoryChange[] = [];
  for (const prev of before) {
    const currentCents = now.get(prev.categoryId) ?? 0;
    const pct = percentChange(prev.totalCents, currentCents);
    if (pct === null) continue;
    changes.push({
      categoryId: prev.categoryId,
      currentCents,
      previousCents: prev.totalCents,
      changePercent: pct,
    });
  }
  return changes.sort(
    (a, b) =>
      Math.abs(b.currentCents - b.previousCents) - Math.abs(a.currentCents - a.previousCents),
  );
}

/** 18 -> "18"; 18.5 -> "18,5" (pt-BR). */
export function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded).replace('.', ',');
}

export interface InsightInput {
  current: PeriodSummary;
  previous: PeriodSummary;
  /** Variações de gastos por categoria (ver `categoryChanges`). */
  expenseChanges: readonly CategoryChange[];
  categoryName: (id: string | null) => string | undefined;
  /** Ex.: "mês anterior". */
  previousLabel: string;
}

/** Variação mínima (em %) e em valor (centavos) para uma categoria virar frase. */
const MIN_CATEGORY_CHANGE_PERCENT = 10;
const MIN_CATEGORY_CHANGE_CENTS = 1000;
const MIN_TOTAL_CHANGE_PERCENT = 5;

const verb = (pct: number) => (pct >= 0 ? 'aumentaram' : 'diminuíram');

/**
 * Até duas frases simples e sem julgamento sobre o período.
 * Nunca recomenda compra ou venda de ativos.
 */
export function buildInsights(input: InsightInput): string[] {
  const { current, previous, expenseChanges, categoryName, previousLabel } = input;
  const sentences: string[] = [];

  const notable = expenseChanges.find(
    (c) =>
      Math.abs(c.changePercent) >= MIN_CATEGORY_CHANGE_PERCENT &&
      Math.abs(c.currentCents - c.previousCents) >= MIN_CATEGORY_CHANGE_CENTS &&
      categoryName(c.categoryId) !== undefined,
  );
  if (notable) {
    sentences.push(
      `Seus gastos com ${categoryName(notable.categoryId)} ${verb(notable.changePercent)} ${formatPercent(
        Math.abs(notable.changePercent),
      )}% em relação ao ${previousLabel}.`,
    );
  } else {
    const total = percentChange(previous.expense, current.expense);
    if (total !== null && Math.abs(total) >= MIN_TOTAL_CHANGE_PERCENT) {
      sentences.push(
        `Seus gastos totais ${verb(total)} ${formatPercent(Math.abs(total))}% em relação ao ${previousLabel}.`,
      );
    }
  }

  if (current.income > 0 && current.investedPercent > 0) {
    sentences.push(
      `Você investiu ${formatPercent(current.investedPercent)}% da sua renda neste período.`,
    );
  }

  return sentences.slice(0, 2);
}
