import type { RankingPeriod } from '@lumioup/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  challengeStandings,
  clubRanking,
  createChallenge,
  deleteChallenge,
  joinChallenge,
  leaveChallenge,
  listChallenges,
  type NewChallenge,
} from './api';

const CHALLENGES_KEY = ['challenges'] as const;
const STANDINGS_KEY = ['challenge-standings'] as const;
const RANKING_KEY = ['club-ranking'] as const;

export const useChallenges = (clubId: string | undefined) =>
  useQuery({
    queryKey: [...CHALLENGES_KEY, clubId],
    queryFn: () => listChallenges(clubId as string),
    enabled: Boolean(clubId),
  });

export const useChallengeStandings = (challengeId: string | undefined) =>
  useQuery({
    queryKey: [...STANDINGS_KEY, challengeId],
    queryFn: () => challengeStandings(challengeId as string),
    enabled: Boolean(challengeId),
  });

export const useClubRanking = (clubId: string | undefined, period: RankingPeriod) =>
  useQuery({
    queryKey: [...RANKING_KEY, clubId, period],
    queryFn: () => clubRanking(clubId as string, period),
    enabled: Boolean(clubId),
  });

/** Mudar um desafio invalida lista e placar. */
function useInvalidateChallenges() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: CHALLENGES_KEY }),
      qc.invalidateQueries({ queryKey: STANDINGS_KEY }),
    ]);
}

export function useCreateChallenge() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: (input: NewChallenge) => createChallenge(input),
    onSuccess: invalidate,
  });
}

export function useJoinChallenge() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: (challengeId: string) => joinChallenge(challengeId),
    onSuccess: invalidate,
  });
}

export function useLeaveChallenge() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: (challengeId: string) => leaveChallenge(challengeId),
    onSuccess: invalidate,
  });
}

export function useDeleteChallenge() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: (challengeId: string) => deleteChallenge(challengeId),
    onSuccess: invalidate,
  });
}
