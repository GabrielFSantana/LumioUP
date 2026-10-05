import type { Cents } from '../money/money';
import { type AccountOpening, netWorth } from './balances';
import { type CategoryTotal, totalsByCategory } from './breakdown';
import { monthPeriod, shiftMonth } from './dates';
import type { CategoryChange } from './insights';
import { type PeriodSummary, filterByPeriod, summarize } from './summary';
import type { DateString, Transaction, TransactionKind } from './types';

const SHORT_MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** "2026-10-05" -> "out" */
export function shortMonthLabel(date: DateString): string {
  const month = Number(date.slice(5, 7));
  return SHORT_MONTHS[month - 1] ?? '';
}

export type ReportRange = '6m' | '12m' | 'ytd';

/** Quantos meses a janela cobre: 6, 12 ou do janeiro do ano até o mês de referência. */
export function reportMonthCount(range: ReportRange, endMonth: DateString): number {
  if (range === '6m') return 6;
  if (range === '12m') return 12;
  return Number(endMonth.slice(5, 7));
}

export interface MonthPoint {
  /** Primeiro dia do mês (YYYY-MM-01). */
  month: DateString;
  /** "out" */
  label: string;
  income: Cents;
  expense: Cents;
  invested: Cents;
  redeemed: Cents;
  profitLoss: Cents;
  balance: Cents;
  investedPercent: number;
  /** Patrimônio líquido no fim do mês (ou hoje, se o mês ainda não acabou). */
  netWorth: Cents;
  /** Valor atual dos investimentos no fim do mês. */
  investedValue: Cents;
  /** Verdadeiro se houve algum lançamento no mês. */
  hasData: boolean;
}

export interface MonthlySeriesInput {
  transactions: readonly Transaction[];
  accounts: readonly AccountOpening[];
  /** Qualquer data do último mês da janela. */
  endMonth: DateString;
  months: number;
  today: DateString;
}

/** Um ponto por mês, do mais antigo ao mais recente, terminando em `endMonth`. */
export function monthlySeries(input: MonthlySeriesInput): MonthPoint[] {
  const { transactions, accounts, endMonth, months, today } = input;
  const points: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = shiftMonth(endMonth, -i);
    const period = monthPeriod(start);
    const items = filterByPeriod(transactions, period);
    const s = summarize(items);
    const asOf = period.to < today ? period.to : today;
    const worth = netWorth(accounts, transactions, asOf);
    points.push({
      month: period.from,
      label: shortMonthLabel(period.from),
      income: s.income,
      expense: s.expense,
      invested: s.invested,
      redeemed: s.redeemed,
      profitLoss: s.profitLoss,
      balance: s.balance,
      investedPercent: s.investedPercent,
      netWorth: worth.total,
      investedValue: worth.invested,
      hasData: items.length > 0,
    });
  }
  return points;
}

export interface ComparisonRow {
  key: 'income' | 'expense' | 'invested' | 'balance';
  label: string;
  current: Cents;
  previous: Cents;
  /** Variação percentual; null quando o valor anterior é zero (sem base). */
  changePercent: number | null;
}

/** Linhas de comparação entre dois períodos, em ordem fixa. */
export function compareSummaries(current: PeriodSummary, previous: PeriodSummary): ComparisonRow[] {
  const row = (
    key: ComparisonRow['key'],
    label: string,
    cur: Cents,
    prev: Cents,
  ): ComparisonRow => ({
    key,
    label,
    current: cur,
    previous: prev,
    changePercent: prev === 0 ? null : Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10,
  });
  return [
    row('income', 'Receitas', current.income, previous.income),
    row('expense', 'Gastos', current.expense, previous.expense),
    row('invested', 'Investido', current.invested, previous.invested),
    row('balance', 'Saldo', current.balance, previous.balance),
  ];
}

/** Categorias que mais cresceram em valor (só aumentos), da maior diferença para a menor. */
export function topIncreases(changes: readonly CategoryChange[], limit = 3): CategoryChange[] {
  return changes
    .filter((c) => c.currentCents > c.previousCents)
    .sort((a, b) => b.currentCents - b.previousCents - (a.currentCents - a.previousCents))
    .slice(0, limit);
}

/** Categorias com valor agora e nenhum valor no período anterior (não há percentual). */
export function newCategories(
  current: readonly Transaction[],
  previous: readonly Transaction[],
  kind: Extract<TransactionKind, 'expense' | 'income' | 'investment'>,
): CategoryTotal[] {
  const before = new Set(totalsByCategory(previous, kind).map((c) => c.categoryId));
  return totalsByCategory(current, kind).filter((c) => !before.has(c.categoryId));
}

/**
 * Teto "redondo" para o eixo de um gráfico (1, 2, 5 ou 10 vezes uma potência de 10).
 * Sem valores positivos retorna 100 (R$ 1), para o eixo não ficar achatado.
 */
export function niceMax(maxValue: number): number {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return 100;
  const power = 10 ** Math.floor(Math.log10(maxValue));
  const n = maxValue / power;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * power;
}
