import {
  deadlineState,
  describeDeadline,
  isMonthlyGoal,
  monthPeriod,
  monthlyGoalProgress,
  monthlyNeeded,
  savingProgress,
  toDateString,
  type DeadlineState,
  type MonthlyProgress,
  type SavingProgress,
  type Transaction,
} from '@lumioup/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useRefreshXp } from '../gamification/hooks';
import { useTransactions } from '../transactions/hooks';
import {
  addContribution,
  createGoal,
  fetchContributions,
  fetchGoals,
  setContributionDeleted,
  updateGoal,
  type Contribution,
  type ContributionInput,
  type Goal,
  type GoalInput,
} from './api';

const GOALS_KEY = ['goals'] as const;
const CONTRIBUTIONS_KEY = ['goal-contributions'] as const;

export const useGoals = () => useQuery({ queryKey: GOALS_KEY, queryFn: fetchGoals });
export const useContributions = () =>
  useQuery({ queryKey: CONTRIBUTIONS_KEY, queryFn: fetchContributions });

function useInvalidateGoals() {
  const qc = useQueryClient();
  const refreshXp = useRefreshXp();
  // O status da meta muda no banco quando as contribuições mudam; por isso invalida os dois.
  // Criar, contribuir e concluir metas também concede XP, que é buscado de novo.
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: GOALS_KEY }),
      qc.invalidateQueries({ queryKey: CONTRIBUTIONS_KEY }),
      refreshXp(),
    ]);
}

export function useCreateGoal() {
  const invalidate = useInvalidateGoals();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (input: GoalInput) => {
      const profileId = session?.user.id;
      if (!profileId) throw new Error('Sessão ausente.');
      return createGoal(profileId, input);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string } & Parameters<typeof updateGoal>[1]) =>
      updateGoal(id, changes),
    onSuccess: invalidate,
  });
}

export function useAddContribution() {
  const invalidate = useInvalidateGoals();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (input: ContributionInput) => {
      const profileId = session?.user.id;
      if (!profileId) throw new Error('Sessão ausente.');
      return addContribution(profileId, input);
    },
    onSuccess: invalidate,
  });
}

export function useSetContributionDeleted() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, deleted }: { id: string; deleted: boolean }) =>
      setContributionDeleted(id, deleted),
    onSuccess: invalidate,
  });
}

export interface GoalView {
  goal: Goal;
  monthly: boolean;
  contributions: Contribution[];
  /** Metas acumulativas. */
  saving: SavingProgress | null;
  /** Metas mensais (mês corrente). */
  monthlyProgress: MonthlyProgress | null;
  /** Percentual para a barra de progresso (0 a 100). */
  barPercent: number;
  deadline: DeadlineState;
  deadlineText: string;
  /** Quanto guardar por mês para chegar ao prazo, quando aplicável. */
  monthlyNeededCents: number | null;
}

/** Junta metas, contribuições e lançamentos do mês e calcula progresso e prazos (via core). */
export function useGoalViews(): {
  views: GoalView[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const today = toDateString(new Date());
  const goals = useGoals();
  const contributions = useContributions();
  const monthItems = useTransactions(monthPeriod(today));

  const views = useMemo(() => {
    const byGoal = new Map<string, Contribution[]>();
    for (const c of contributions.data ?? []) {
      const list = byGoal.get(c.goalId);
      if (list) list.push(c);
      else byGoal.set(c.goalId, [c]);
    }
    return (goals.data ?? []).map((goal): GoalView => {
      const monthly = isMonthlyGoal(goal.kind);
      const list = byGoal.get(goal.id) ?? [];
      if (monthly) {
        const progress = monthlyGoalProgress(goal, (monthItems.data ?? []) as Transaction[]);
        return {
          goal,
          monthly,
          contributions: [],
          saving: null,
          monthlyProgress: progress,
          barPercent: Math.min(100, progress.percent),
          deadline: 'none',
          deadlineText: 'Todo mês',
          monthlyNeededCents: null,
        };
      }
      const saving = savingProgress(goal.targetCents, list);
      const deadlineInput = { deadline: goal.deadline, today, reached: saving.reached };
      return {
        goal,
        monthly,
        contributions: list,
        saving,
        monthlyProgress: null,
        barPercent: saving.percent,
        deadline: deadlineState(deadlineInput),
        deadlineText: describeDeadline(deadlineInput),
        monthlyNeededCents: monthlyNeeded({
          remainingCents: saving.remainingCents,
          deadline: goal.deadline,
          today,
        }),
      };
    });
  }, [goals.data, contributions.data, monthItems.data, today]);

  return {
    views,
    isLoading: goals.isLoading || contributions.isLoading,
    isError: goals.isError || contributions.isError,
    refetch: () => {
      void goals.refetch();
      void contributions.refetch();
    },
  };
}
