import type { Cents } from '../money/money';
import { percentOf } from '../money/money';
import type { AccountOpening } from './balances';
import type { CategoryTotal } from './breakdown';
import { monthPeriod, shiftMonth } from './dates';
import {
  type CategoryChange,
  type TopCategories,
  categoryChanges,
  topCategories,
} from './insights';
import {
  type ComparisonRow,
  type MonthPoint,
  type ReportRange,
  compareSummaries,
  monthlySeries,
  newCategories,
  reportMonthCount,
  topIncreases,
} from './reports';
import { filterByPeriod, summarize } from './summary';
import type { DateString, Period, Transaction } from './types';

export interface ReportInput {
  transactions: readonly Transaction[];
  accounts: readonly AccountOpening[];
  /** Qualquer data do mês de referência (último mês da janela). */
  endMonth: DateString;
  range: ReportRange;
  today: DateString;
  maxCategories?: number;
}

export interface WindowTotals {
  income: Cents;
  expense: Cents;
  invested: Cents;
  profitLoss: Cents;
  /** Aportes / receitas na janela inteira, em % com 1 casa (0 sem receita). */
  investedPercent: number;
}

export interface Report {
  series: MonthPoint[];
  window: Period;
  currentMonth: Period;
  previousMonth: Period;
  /** Mês de referência contra o mês anterior. */
  comparison: ComparisonRow[];
  /** Categorias de gasto que mais cresceram (com base no mês anterior). */
  increases: CategoryChange[];
  /** Categorias de gasto que não existiam no mês anterior. */
  newExpenseCategories: CategoryTotal[];
  topExpenses: TopCategories;
  topIncome: TopCategories;
  windowTotals: WindowTotals;
  /** Verdadeiro quando não há nenhum lançamento na janela. */
  isEmpty: boolean;
}

/** Monta todos os dados da tela de relatórios. */
export function buildReport(input: ReportInput): Report {
  const { transactions, accounts, endMonth, range, today } = input;
  const months = reportMonthCount(range, endMonth);
  const series = monthlySeries({ transactions, accounts, endMonth, months, today });

  const currentMonth = monthPeriod(endMonth);
  const previousMonth = monthPeriod(shiftMonth(endMonth, -1));
  const window: Period = {
    from: series[0]?.month ?? currentMonth.from,
    to: currentMonth.to,
  };

  const windowItems = filterByPeriod(transactions, window);
  const currentItems = filterByPeriod(transactions, currentMonth);
  const previousItems = filterByPeriod(transactions, previousMonth);
  const windowSummary = summarize(windowItems);
  const maxCategories = input.maxCategories ?? 5;

  return {
    series,
    window,
    currentMonth,
    previousMonth,
    comparison: compareSummaries(summarize(currentItems), summarize(previousItems)),
    increases: topIncreases(categoryChanges(currentItems, previousItems, 'expense')),
    newExpenseCategories: newCategories(currentItems, previousItems, 'expense'),
    topExpenses: topCategories(windowItems, 'expense', maxCategories),
    topIncome: topCategories(windowItems, 'income', maxCategories),
    windowTotals: {
      income: windowSummary.income,
      expense: windowSummary.expense,
      invested: windowSummary.invested,
      profitLoss: windowSummary.profitLoss,
      investedPercent: percentOf(windowSummary.invested, windowSummary.income),
    },
    isEmpty: windowItems.length === 0,
  };
}
