import type { CategoryKind } from '../catalog/catalog';
import type { DateString, Period, Transaction, TransactionKind } from './types';
import { isInvestmentKind, isValidDate } from './validation';

const pad = (n: number) => String(n).padStart(2, '0');

/** Data local do aparelho como YYYY-MM-DD (nunca converte para UTC, evita "virar o dia"). */
export function toDateString(date: Date): DateString {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parts(date: DateString): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return [y, m, d];
}

export function addDays(date: DateString, days: number): DateString {
  const [y, m, d] = parts(date);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Primeiro e último dia do mês da data informada. */
export function monthPeriod(date: DateString): Period {
  const [y, m] = parts(date);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay)}` };
}

/** Primeiro dia do mês deslocado em `delta` meses (aceita negativos). */
export function shiftMonth(date: DateString, delta: number): DateString {
  const [y, m] = parts(date);
  const next = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-01`;
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

/** "outubro de 2026" */
export function formatMonthLabel(date: DateString): string {
  const [y, m] = parts(date);
  return `${MONTHS[m - 1]} de ${y}`;
}

/** "2026-10-05" -> "05/10/2026" */
export function formatBrDate(date: DateString): string {
  const [y, m, d] = parts(date);
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** "05/10/2026" (ou "5/10/2026") -> "2026-10-05"; null se inválida. */
export function parseBrDate(input: string): DateString | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input.trim());
  if (!match) return null;
  const date = `${match[3]}-${pad(Number(match[2]))}-${pad(Number(match[1]))}`;
  return isValidDate(date) ? date : null;
}

/** "Hoje", "Ontem" ou "sexta-feira, 02/10". */
export function formatDayLabel(date: DateString, today: DateString): string {
  if (date === today) return 'Hoje';
  if (date === addDays(today, -1)) return 'Ontem';
  const [y, m, d] = parts(date);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday}, ${pad(d)}/${pad(m)}`;
}

export interface DayGroup<T extends { occurredOn: DateString }> {
  date: DateString;
  items: T[];
}

/** Agrupa por dia, dias do mais recente ao mais antigo; mantém a ordem dos itens dentro do dia. */
export function groupByDay<T extends { occurredOn: DateString }>(
  items: readonly T[],
): DayGroup<T>[] {
  const map = new Map<DateString, T[]>();
  for (const item of items) {
    const list = map.get(item.occurredOn);
    if (list) list.push(item);
    else map.set(item.occurredOn, [item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, list]) => ({ date, items: list }));
}

/** Sinal para exibição: entrada +1, saída -1, transferência 0 (movimento interno). */
export function displaySign(kind: TransactionKind): 1 | -1 | 0 {
  switch (kind) {
    case 'income':
    case 'redemption':
    case 'profit':
      return 1;
    case 'expense':
    case 'investment':
    case 'loss':
      return -1;
    case 'transfer':
      return 0;
  }
}

/** Tipo de categoria exigido pelo tipo de lançamento (null para transferência). */
export function categoryKindFor(kind: TransactionKind): CategoryKind | null {
  switch (kind) {
    case 'expense':
      return 'expense';
    case 'income':
      return 'income';
    case 'transfer':
      return null;
    default:
      return 'investment';
  }
}

export type TransactionFilter = 'all' | 'expense' | 'income' | 'transfer' | 'investing';

/** `investing` reúne aporte, resgate, lucro e perda. */
export function matchesFilter(t: Pick<Transaction, 'kind'>, filter: TransactionFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'investing') return isInvestmentKind(t.kind);
  return t.kind === filter;
}
