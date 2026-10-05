import {
  type AccountOpening,
  type NetWorth,
  type NetWorthPoint,
  netWorth,
  netWorthSeries,
} from './balances';
import { buildInsights, categoryChanges, topCategories, type TopCategories } from './insights';
import {
  formatPeriodLabel,
  periodFor,
  previousLabel,
  previousPeriod,
  sampleDates,
  type PeriodKind,
} from './periods';
import { type PeriodSummary, filterByPeriod, summarize } from './summary';
import type { DateString, Period, Transaction } from './types';

export interface DashboardInput {
  kind: PeriodKind;
  /** Data dentro do período escolhido (ignorada em `custom`). */
  anchor: DateString;
  /** Obrigatório em `custom`; precisa ter início <= fim. */
  custom?: Period;
  today: DateString;
  /** Todos os lançamentos do usuário (o patrimônio depende do histórico completo). */
  transactions: readonly Transaction[];
  /** Todas as contas, inclusive arquivadas (os saldos iniciais fazem parte do patrimônio). */
  accounts: readonly AccountOpening[];
  categoryName: (id: string | null) => string | undefined;
  /** Quantas categorias mostrar nos rankings. */
  maxCategories?: number;
}

export interface Dashboard {
  period: Period;
  previous: Period;
  label: string;
  summary: PeriodSummary;
  previousSummary: PeriodSummary;
  topExpenses: TopCategories;
  topIncome: TopCategories;
  /** Até duas frases neutras de comparação. */
  insights: string[];
  netWorthSeries: NetWorthPoint[];
  /** Patrimônio no fim do período (ou hoje, se o período ainda não terminou). */
  netWorthNow: NetWorth;
  /** Diferença entre o primeiro e o último ponto da série; null com menos de 2 pontos. */
  netWorthChangeCents: number | null;
  /** Verdadeiro quando não há nenhum lançamento no período. */
  isEmpty: boolean;
}

/** Monta todos os números do painel para um período. Lança RangeError se o período for inválido. */
export function buildDashboard(input: DashboardInput): Dashboard {
  const { kind, anchor, custom, today, transactions, accounts, categoryName } = input;
  const period = periodFor(kind, anchor, custom);
  const previous = previousPeriod(kind, period);
  const maxCategories = input.maxCategories ?? 5;

  const currentItems = filterByPeriod(transactions, period);
  const previousItems = filterByPeriod(transactions, previous);
  const summary = summarize(currentItems);
  const previousSummary = summarize(previousItems);

  const dates = sampleDates(period, today);
  const series = netWorthSeries(accounts, transactions, dates);
  const asOf = period.to < today ? period.to : today;

  return {
    period,
    previous,
    label: formatPeriodLabel(kind, period, today),
    summary,
    previousSummary,
    topExpenses: topCategories(currentItems, 'expense', maxCategories),
    topIncome: topCategories(currentItems, 'income', maxCategories),
    insights: buildInsights({
      current: summary,
      previous: previousSummary,
      expenseChanges: categoryChanges(currentItems, previousItems, 'expense'),
      categoryName,
      previousLabel: previousLabel(kind),
    }),
    netWorthSeries: series,
    netWorthNow: netWorth(accounts, transactions, asOf),
    netWorthChangeCents:
      series.length >= 2 ? (series[series.length - 1]?.total ?? 0) - (series[0]?.total ?? 0) : null,
    isEmpty: currentItems.length === 0,
  };
}
