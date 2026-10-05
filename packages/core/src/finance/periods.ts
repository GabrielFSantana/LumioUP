import { addDays, formatBrDate, formatMonthLabel, monthPeriod, shiftMonth } from './dates';
import type { DateString, Period } from './types';

export type PeriodKind = 'day' | 'week' | 'month' | 'year' | 'custom';

function parts(date: DateString): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return [y, m, d];
}

/** Dia da semana: 0 = domingo ... 6 = sábado. */
export function weekdayOf(date: DateString): number {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Quantidade de dias de um período, contando as duas pontas. */
export function daysInPeriod(period: Period): number {
  const [fy, fm, fd] = parts(period.from);
  const [ty, tm, td] = parts(period.to);
  const ms = Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd);
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * Período que contém a data âncora. Semana vai de domingo a sábado.
 * Em `custom` o período é o informado (ou o próprio dia, se não houver).
 */
export function periodFor(kind: PeriodKind, anchor: DateString, custom?: Period): Period {
  switch (kind) {
    case 'day':
      return { from: anchor, to: anchor };
    case 'week': {
      const from = addDays(anchor, -weekdayOf(anchor));
      return { from, to: addDays(from, 6) };
    }
    case 'month':
      return monthPeriod(anchor);
    case 'year': {
      const [y] = parts(anchor);
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    }
    case 'custom':
      return custom ?? { from: anchor, to: anchor };
  }
}

/** Move a âncora um período para frente (delta > 0) ou para trás (delta < 0). */
export function shiftAnchor(kind: PeriodKind, anchor: DateString, delta: number): DateString {
  switch (kind) {
    case 'day':
      return addDays(anchor, delta);
    case 'week':
      return addDays(anchor, 7 * delta);
    case 'month':
      return shiftMonth(anchor, delta);
    case 'year': {
      const [y] = parts(anchor);
      return `${y + delta}-01-01`;
    }
    case 'custom':
      return anchor;
  }
}

/** Desloca um período personalizado pelo próprio tamanho. */
export function shiftCustomPeriod(period: Period, delta: number): Period {
  const size = daysInPeriod(period);
  return { from: addDays(period.from, size * delta), to: addDays(period.to, size * delta) };
}

/**
 * Período imediatamente anterior, para comparação: dia anterior, semana anterior,
 * mês anterior, ano anterior, ou o mesmo número de dias antes (personalizado).
 */
export function previousPeriod(kind: PeriodKind, period: Period): Period {
  switch (kind) {
    case 'day':
    case 'week':
    case 'custom': {
      const size = daysInPeriod(period);
      return { from: addDays(period.from, -size), to: addDays(period.from, -1) };
    }
    case 'month':
      return monthPeriod(shiftMonth(period.from, -1));
    case 'year': {
      const [y] = parts(period.from);
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    }
  }
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Hoje", "28/09 a 04/10", "Outubro de 2026", "2026" ou "01/10/2026 a 15/10/2026". */
export function formatPeriodLabel(kind: PeriodKind, period: Period, today: DateString): string {
  switch (kind) {
    case 'day':
      return period.from === today ? 'Hoje' : formatBrDate(period.from);
    case 'week':
      return `${formatBrDate(period.from).slice(0, 5)} a ${formatBrDate(period.to).slice(0, 5)}`;
    case 'month':
      return capitalize(formatMonthLabel(period.from));
    case 'year':
      return period.from.slice(0, 4);
    case 'custom':
      return `${formatBrDate(period.from)} a ${formatBrDate(period.to)}`;
  }
}

/** Texto para "em relação ao ...". */
export function previousLabel(kind: PeriodKind): string {
  switch (kind) {
    case 'day':
      return 'dia anterior';
    case 'week':
      return 'semana anterior';
    case 'month':
      return 'mês anterior';
    case 'year':
      return 'ano anterior';
    case 'custom':
      return 'período anterior';
  }
}

/**
 * Datas para amostrar o gráfico de patrimônio: espaçadas de forma uniforme entre o início
 * do período e o fim (limitado a hoje), sempre incluindo as duas pontas.
 * Retorna lista vazia se o período ainda não começou.
 */
export function sampleDates(period: Period, today: DateString, maxPoints = 12): DateString[] {
  if (period.from > today) return [];
  const end = period.to < today ? period.to : today;
  const total = daysInPeriod({ from: period.from, to: end });
  if (total <= 1) return [end];
  const count = Math.min(maxPoints, total);
  const dates: DateString[] = [];
  for (let i = 0; i < count; i++) {
    const offset = Math.round((i * (total - 1)) / (count - 1));
    dates.push(addDays(period.from, offset));
  }
  return dates;
}
