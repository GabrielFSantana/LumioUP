import {
  buildMissionRows,
  describeStreak,
  effectiveStreak,
  levelProgress,
  missionPeriodStart,
  streakState,
  summarizeAchievements,
  toDateString,
  weekActiveIndexes,
  type LevelProgress,
  type MissionRow,
  type StreakState,
} from '@lumioup/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  acknowledgeLevel,
  fetchAchievements,
  fetchActivityDays,
  fetchLevels,
  fetchMissionTemplates,
  fetchUnlockedAchievements,
  fetchUserMissions,
  fetchUserStats,
  fetchXpEvents,
  fetchXpRules,
  type Achievement,
} from './api';

const STATS_KEY = ['user-stats'] as const;
const EVENTS_KEY = ['xp-events'] as const;
const PROGRESS_KEYS = [
  ['activity-days'],
  ['user-missions'],
  ['unlocked-achievements'],
  // Lançamentos e contribuições também andam o progresso dos desafios e o ranking dos clubes.
  ['challenges'],
  ['challenge-standings'],
  ['club-ranking'],
  // As sugestões de leitura partem dos registros recentes.
  ['education-recommended'],
] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Níveis e regras são configuração: mudam raramente, então ficam em cache por um dia. */
export const useLevels = () =>
  useQuery({ queryKey: ['levels'], queryFn: fetchLevels, staleTime: DAY_MS });
export const useXpRules = () =>
  useQuery({ queryKey: ['xp-rules'], queryFn: fetchXpRules, staleTime: DAY_MS });

export const useUserStats = () => useQuery({ queryKey: STATS_KEY, queryFn: fetchUserStats });
export const useXpEvents = (limit = 30) =>
  useQuery({ queryKey: [...EVENTS_KEY, limit], queryFn: () => fetchXpEvents(limit) });

/**
 * Devolve uma função que atualiza XP e nível. O XP é concedido pelo servidor dentro da própria
 * operação (gatilhos), então basta buscar de novo depois que ela termina.
 */
export function useRefreshXp() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: STATS_KEY }),
      qc.invalidateQueries({ queryKey: EVENTS_KEY }),
      ...PROGRESS_KEYS.map((key) => qc.invalidateQueries({ queryKey: key })),
    ]);
}

export function useAcknowledgeLevel() {
  const refresh = useRefreshXp();
  return useMutation({ mutationFn: acknowledgeLevel, onSuccess: refresh });
}

/** XP total mais o progresso dentro do nível (cálculo no core). */
export function useLevelProgress(): {
  progress: LevelProgress | null;
  totalXp: number;
  isLoading: boolean;
} {
  const stats = useUserStats();
  const levels = useLevels();
  const progress = useMemo(
    () =>
      levels.data && levels.data.length > 0
        ? levelProgress(stats.data?.totalXp ?? 0, levels.data)
        : null,
    [levels.data, stats.data?.totalXp],
  );
  return {
    progress,
    totalXp: stats.data?.totalXp ?? 0,
    isLoading: stats.isLoading || levels.isLoading,
  };
}

export interface StreakInfo {
  days: number;
  best: number;
  state: StreakState;
  message: string;
}

/** Sequência atual (zerada na tela se já quebrou), recorde e mensagem neutra. */
export function useStreak(): StreakInfo {
  const { data } = useUserStats();
  const today = toDateString(new Date());
  const input = {
    currentStreak: data?.currentStreak ?? 0,
    lastActiveOn: data?.lastActiveOn ?? null,
    today,
  };
  const state = streakState(input);
  const days = effectiveStreak(input);
  return { days, best: data?.bestStreak ?? 0, state, message: describeStreak(state, days) };
}

/** Índices (0 = domingo) dos dias da semana atual com atividade. */
export function useWeekActiveDays(): number[] {
  const today = toDateString(new Date());
  const weekStart = missionPeriodStart('weekly', today);
  const query = useQuery({
    queryKey: ['activity-days', weekStart],
    queryFn: () => fetchActivityDays(weekStart),
  });
  return useMemo(() => weekActiveIndexes(query.data ?? [], today), [query.data, today]);
}

/** Missões do dia e da semana com o progresso atual. */
export function useMissions(): { rows: MissionRow[]; isLoading: boolean } {
  const today = toDateString(new Date());
  const weekStart = missionPeriodStart('weekly', today);
  const templates = useQuery({
    queryKey: ['mission-templates'],
    queryFn: fetchMissionTemplates,
    staleTime: DAY_MS,
  });
  const progress = useQuery({
    queryKey: ['user-missions', weekStart],
    queryFn: () => fetchUserMissions(weekStart),
  });
  const rows = useMemo(
    () => buildMissionRows(templates.data ?? [], progress.data ?? [], today),
    [templates.data, progress.data, today],
  );
  return { rows, isLoading: templates.isLoading || progress.isLoading };
}

export interface AchievementView extends Achievement {
  unlocked: boolean;
  unlockedAt: string | null;
}

export function useAchievements(): {
  items: AchievementView[];
  summary: { unlocked: number; total: number };
  isLoading: boolean;
} {
  const catalog = useQuery({
    queryKey: ['achievements'],
    queryFn: fetchAchievements,
    staleTime: DAY_MS,
  });
  const unlocked = useQuery({
    queryKey: ['unlocked-achievements'],
    queryFn: fetchUnlockedAchievements,
  });
  const items = useMemo(() => {
    const byCode = new Map((unlocked.data ?? []).map((u) => [u.code, u.unlockedAt]));
    return (catalog.data ?? []).map((a) => ({
      ...a,
      unlocked: byCode.has(a.code),
      unlockedAt: byCode.get(a.code) ?? null,
    }));
  }, [catalog.data, unlocked.data]);
  const summary = useMemo(
    () =>
      summarizeAchievements(
        catalog.data ?? [],
        (unlocked.data ?? []).map((u) => u.code),
      ),
    [catalog.data, unlocked.data],
  );
  return { items, summary, isLoading: catalog.isLoading || unlocked.isLoading };
}
