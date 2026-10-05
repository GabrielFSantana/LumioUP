import type { GoalKind, GoalStatus } from '@lumioup/core';
import { fetchAllPages } from '../../lib/paging';
import { supabase } from '../../lib/supabase';

export interface Goal {
  id: string;
  name: string;
  kind: GoalKind;
  targetCents: number;
  deadline: string | null;
  expenseCategoryId: string | null;
  status: GoalStatus;
  completedAt: string | null;
  createdAt: string;
}

export interface Contribution {
  id: string;
  goalId: string;
  /** Positivo = guardou; negativo = retirou. */
  amountCents: number;
  occurredOn: string;
  note: string | null;
}

/** Erro do banco com mensagem e código preservados, para tradução amigável. */
export class GoalError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function fail(error: { message: string; code?: string }): never {
  throw new GoalError(error.message, error.code);
}

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select(
      'id, name, kind, target_cents, deadline, expense_category_id, status, completed_at, created_at',
    )
    .order('created_at');
  if (error) fail(error);
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind as GoalKind,
    targetCents: row.target_cents,
    deadline: row.deadline,
    expenseCategoryId: row.expense_category_id,
    status: row.status as GoalStatus,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  }));
}

/** Todas as contribuições não excluídas, das mais recentes para as mais antigas. */
export async function fetchContributions(): Promise<Contribution[]> {
  const rows = await fetchAllPages(
    (from, to) =>
      supabase
        .from('goal_contributions')
        .select('id, goal_id, amount_cents, occurred_on, note')
        .is('deleted_at', null)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, to),
    fail,
  );
  return rows.map((row) => ({
    id: row.id,
    goalId: row.goal_id,
    amountCents: row.amount_cents,
    occurredOn: row.occurred_on,
    note: row.note,
  }));
}

export interface GoalInput {
  kind: GoalKind;
  name: string;
  targetCents: number;
  deadline: string | null;
  expenseCategoryId: string | null;
}

export async function createGoal(profileId: string, input: GoalInput): Promise<void> {
  const { error } = await supabase.from('goals').insert({
    profile_id: profileId,
    name: input.name.trim(),
    kind: input.kind,
    target_cents: input.targetCents,
    deadline: input.deadline,
    expense_category_id: input.expenseCategoryId,
  });
  if (error) fail(error);
}

/** Tipo e categoria não mudam depois que a meta é criada. */
export async function updateGoal(
  id: string,
  changes: {
    name?: string;
    targetCents?: number;
    deadline?: string | null;
    status?: GoalStatus;
  },
): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .update({
      ...(changes.name !== undefined && { name: changes.name.trim() }),
      ...(changes.targetCents !== undefined && { target_cents: changes.targetCents }),
      ...(changes.deadline !== undefined && { deadline: changes.deadline }),
      ...(changes.status !== undefined && { status: changes.status }),
    })
    .eq('id', id);
  if (error) fail(error);
}

export interface ContributionInput {
  goalId: string;
  amountCents: number;
  occurredOn: string;
  note?: string | null;
}

export async function addContribution(profileId: string, input: ContributionInput): Promise<void> {
  const { error } = await supabase.from('goal_contributions').insert({
    profile_id: profileId,
    goal_id: input.goalId,
    amount_cents: input.amountCents,
    occurred_on: input.occurredOn,
    note: input.note?.trim() ? input.note.trim() : null,
  });
  if (error) fail(error);
}

/** Exclusão lógica: permite "Desfazer". */
export async function setContributionDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await supabase
    .from('goal_contributions')
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) fail(error);
}

export function friendlyGoalError(error: unknown): string {
  const text = error instanceof Error ? error.message : '';
  if (text.includes('negative_goal_balance')) {
    return 'Você não pode retirar mais do que já guardou nesta meta.';
  }
  if (text.includes('goal_not_active')) return 'Retome a meta para registrar contribuições.';
  if (text.includes('invalid_deadline')) return 'O prazo precisa ser hoje ou depois.';
  if (text.includes('goal_limit_reached')) return 'Você chegou ao limite de metas.';
  if (text.includes('category_archived')) return 'Essa categoria está arquivada. Escolha outra.';
  if (text.includes('invalid_date')) return 'Essa data está fora do período aceito.';
  if (text.toLowerCase().includes('fetch') || text.toLowerCase().includes('network')) {
    return 'Sem conexão no momento. Verifique sua internet.';
  }
  return 'Algo deu errado. Tente novamente em instantes.';
}
