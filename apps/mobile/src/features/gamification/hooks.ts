import { levelProgress, type LevelProgress } from '@lumioup/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { acknowledgeLevel, fetchLevels, fetchUserStats, fetchXpEvents, fetchXpRules } from './api';

const STATS_KEY = ['user-stats'] as const;
const EVENTS_KEY = ['xp-events'] as const;
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
