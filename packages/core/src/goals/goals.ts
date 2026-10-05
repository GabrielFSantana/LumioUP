import { type Cents, formatBRL } from '../money/money';
import { MAX_OPENING_BALANCE_CENTS, validateCatalogName } from '../catalog/catalog';
import { daysInPeriod } from '../finance/periods';
import type { DateString, Transaction } from '../finance/types';
import { isValidDate } from '../finance/validation';

export type GoalKind =
  'emergency' | 'save' | 'debt' | 'trip' | 'purchase' | 'invest_monthly' | 'spending_limit';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export const GOAL_KIND_LABELS: Record<GoalKind, string> = {
  emergency: 'Reserva de emergência',
  save: 'Economizar',
  debt: 'Quitar dívida',
  trip: 'Viagem',
  purchase: 'Comprar um bem',
  invest_monthly: 'Investir todo mês',
  spending_limit: 'Limite de gastos',
};

/** Frase curta de apoio ao escolher o tipo. */
export const GOAL_KIND_HINTS: Record<GoalKind, string> = {
  emergency: 'Guarde um valor para imprevistos.',
  save: 'Junte um valor até uma data.',
  debt: 'Acompanhe quanto já foi pago.',
  trip: 'Planeje o valor da próxima viagem.',
  purchase: 'Junte para algo que você quer comprar.',
  invest_monthly: 'Quanto aportar em investimentos a cada mês.',
  spending_limit: 'Um teto mensal para uma categoria de gasto.',
};

/** Metas mensais calculam o progresso pelos lançamentos do mês; não têm contribuições nem prazo. */
export const MONTHLY_GOAL_KINDS = ['invest_monthly', 'spending_limit'] as const;

export function isMonthlyGoal(kind: GoalKind): boolean {
  return (MONTHLY_GOAL_KINDS as readonly string[]).includes(kind);
}

export interface SavingProgress {
  /** Soma das contribuições (nunca negativa). */
  currentCents: Cents;
  /** 0 a 100, arredondado para baixo (só chega a 100 ao atingir o alvo). */
  percent: number;
  remainingCents: Cents;
  reached: boolean;
}

/** Progresso de uma meta acumulativa a partir das contribuições (já sem as excluídas). */
export function savingProgress(
  targetCents: Cents,
  contributions: readonly { amountCents: Cents }[],
): SavingProgress {
  const currentCents = Math.max(
    0,
    contributions.reduce((sum, c) => sum + c.amountCents, 0),
  );
  const reached = targetCents > 0 && currentCents >= targetCents;
  const percent =
    targetCents <= 0 ? 0 : reached ? 100 : Math.floor((currentCents / targetCents) * 100);
  return {
    currentCents,
    percent,
    remainingCents: Math.max(0, targetCents - currentCents),
    reached,
  };
}

/** Dias entre hoje e o prazo (negativo se o prazo já passou; 0 = vence hoje). */
export function daysUntil(deadline: DateString, today: DateString): number {
  if (deadline >= today) return daysInPeriod({ from: today, to: deadline }) - 1;
  return -(daysInPeriod({ from: deadline, to: today }) - 1);
}

export type DeadlineState = 'none' | 'ok' | 'soon' | 'overdue' | 'done';

/** Prazo "próximo": a partir de quantos dias restantes o app avisa. */
export const SOON_DAYS = 14;

export function deadlineState(input: {
  deadline: DateString | null;
  today: DateString;
  reached: boolean;
}): DeadlineState {
  const { deadline, today, reached } = input;
  if (reached) return 'done';
  if (!deadline) return 'none';
  const days = daysUntil(deadline, today);
  if (days < 0) return 'overdue';
  if (days <= SOON_DAYS) return 'soon';
  return 'ok';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Texto neutro sobre o prazo. */
export function describeDeadline(input: {
  deadline: DateString | null;
  today: DateString;
  reached: boolean;
}): string {
  const state = deadlineState(input);
  if (state === 'done') return 'Meta atingida';
  if (state === 'none' || !input.deadline) return 'Sem prazo';
  const days = daysUntil(input.deadline, input.today);
  if (days === 0) return 'Vence hoje';
  if (days < 0) return `Prazo passou há ${plural(-days, 'dia', 'dias')}`;
  return days === 1 ? 'Falta 1 dia' : `Faltam ${days} dias`;
}

/**
 * Quanto guardar por mês para chegar ao alvo até o prazo (arredondado para cima).
 * É só aritmética de planejamento. Retorna null sem prazo, com meta atingida ou prazo vencido.
 */
export function monthlyNeeded(input: {
  remainingCents: Cents;
  deadline: DateString | null;
  today: DateString;
}): Cents | null {
  const { remainingCents, deadline, today } = input;
  if (!deadline || remainingCents <= 0) return null;
  const days = daysUntil(deadline, today);
  if (days < 0) return null;
  const monthsLeft = Math.max(1, Math.ceil(days / 30));
  return Math.ceil(remainingCents / monthsLeft);
}

export type MonthlyGoalState = 'ok' | 'near' | 'over' | 'done';

export interface MonthlyProgress {
  /** Gasto na categoria (limite) ou total aportado (investir) no mês. */
  valueCents: Cents;
  /** Percentual do alvo, inteiro, sem teto (pode passar de 100). */
  percent: number;
  /**
   * Limite de gastos: ok (<80%), near (80% a 99%), over (100% ou mais).
   * Investir todo mês: ok (abaixo do alvo) ou done (alvo atingido).
   */
  state: MonthlyGoalState;
}

/** Percentual do limite a partir do qual o app avisa que está perto. */
export const NEAR_LIMIT_PERCENT = 80;

/** Progresso de uma meta mensal a partir dos lançamentos do mês corrente. */
export function monthlyGoalProgress(
  goal: { kind: GoalKind; targetCents: Cents; expenseCategoryId: string | null },
  monthItems: readonly Transaction[],
): MonthlyProgress {
  let valueCents = 0;
  for (const t of monthItems) {
    if (goal.kind === 'spending_limit') {
      if (t.kind === 'expense' && t.categoryId === goal.expenseCategoryId) {
        valueCents += t.amountCents;
      }
    } else if (t.kind === 'investment') {
      valueCents += t.amountCents;
    }
  }
  const percent = goal.targetCents > 0 ? Math.floor((valueCents / goal.targetCents) * 100) : 0;
  if (goal.kind === 'spending_limit') {
    const state: MonthlyGoalState =
      percent >= 100 ? 'over' : percent >= NEAR_LIMIT_PERCENT ? 'near' : 'ok';
    return { valueCents, percent, state };
  }
  return { valueCents, percent, state: percent >= 100 ? 'done' : 'ok' };
}

/** Texto neutro e sem julgamento sobre uma meta mensal. */
export function describeMonthlyProgress(
  kind: GoalKind,
  progress: MonthlyProgress,
  targetCents: Cents,
): string {
  if (kind === 'spending_limit') {
    if (progress.state === 'over') {
      return `Você passou do limite deste mês (${formatBRL(progress.valueCents)} de ${formatBRL(targetCents)}).`;
    }
    return `Você usou ${progress.percent}% do limite deste mês.`;
  }
  if (progress.state === 'done') return 'Aporte do mês concluído.';
  return `Você aportou ${formatBRL(progress.valueCents)} de ${formatBRL(targetCents)} neste mês.`;
}

export interface GoalInput {
  kind: GoalKind;
  name: string;
  targetCents: Cents;
  deadline: DateString | null;
  expenseCategoryId: string | null;
}

/** Valida os dados de uma meta nova. Retorna mensagem (pt-BR) ou null se válida. */
export function validateGoalInput(input: GoalInput, today: DateString): string | null {
  const nameError = validateCatalogName(input.name);
  if (nameError) return nameError;
  if (!Number.isSafeInteger(input.targetCents) || input.targetCents <= 0) {
    return 'Informe um valor maior que zero.';
  }
  if (input.targetCents > MAX_OPENING_BALANCE_CENTS) return 'Esse valor é alto demais.';
  if (isMonthlyGoal(input.kind)) {
    if (input.deadline) return 'Metas mensais não têm prazo: elas se renovam todo mês.';
  } else if (input.deadline) {
    if (!isValidDate(input.deadline)) return 'Use uma data válida.';
    if (input.deadline < today) return 'O prazo precisa ser hoje ou depois.';
  }
  if (input.kind === 'spending_limit' && !input.expenseCategoryId) {
    return 'Escolha a categoria de gasto.';
  }
  if (input.kind !== 'spending_limit' && input.expenseCategoryId) {
    return 'Só o limite de gastos usa categoria.';
  }
  return null;
}
