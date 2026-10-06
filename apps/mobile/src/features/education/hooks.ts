import { trackProgress, type TrackProgress } from '@lumioup/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useRefreshXp } from '../gamification/hooks';
import {
  TRACK_SLUG,
  completeArticle,
  getArticle,
  getTrack,
  listArticles,
  listGlossary,
  listProgress,
  listQuizQuestions,
  recommendedArticles,
  submitQuiz,
} from './api';

const DAY_MS = 24 * 60 * 60 * 1000;
const PROGRESS_KEY = ['education-progress'] as const;
const RECOMMENDED_KEY = ['education-recommended'] as const;

/** O conteúdo é configuração: muda raramente, então fica em cache por um dia. */
export const useArticles = () =>
  useQuery({ queryKey: ['articles'], queryFn: listArticles, staleTime: DAY_MS });

export const useArticle = (slug: string | undefined) =>
  useQuery({
    queryKey: ['article', slug],
    queryFn: () => getArticle(slug as string),
    enabled: Boolean(slug),
    staleTime: DAY_MS,
  });

export const useTrack = () =>
  useQuery({
    queryKey: ['track', TRACK_SLUG],
    queryFn: () => getTrack(TRACK_SLUG),
    staleTime: DAY_MS,
  });

export const useGlossary = () =>
  useQuery({ queryKey: ['glossary'], queryFn: listGlossary, staleTime: DAY_MS });

export const useQuizQuestions = (slug: string | undefined) =>
  useQuery({
    queryKey: ['quiz-questions', slug],
    queryFn: () => listQuizQuestions(slug as string),
    enabled: Boolean(slug),
    staleTime: DAY_MS,
  });

export const useEducationProgress = () =>
  useQuery({ queryKey: PROGRESS_KEY, queryFn: listProgress });

export const useRecommendations = () =>
  useQuery({ queryKey: RECOMMENDED_KEY, queryFn: recommendedArticles });

/** Progresso da trilha "Primeiros passos" e conjunto de artigos já lidos. */
export function useTrackProgress(): {
  progress: TrackProgress | null;
  completed: ReadonlySet<string>;
  isLoading: boolean;
} {
  const track = useTrack();
  const progress = useEducationProgress();
  const completed = useMemo(
    () =>
      new Set(
        (progress.data ?? [])
          .filter((row) => row.completedAt !== null)
          .map((row) => row.articleSlug),
      ),
    [progress.data],
  );
  const value = useMemo(
    () => (track.data ? trackProgress(track.data.articleSlugs, completed) : null),
    [track.data, completed],
  );
  return { progress: value, completed, isLoading: track.isLoading || progress.isLoading };
}

/** Depois de ler ou responder, atualiza progresso, sugestões, XP e conquistas. */
function useAfterLearning() {
  const qc = useQueryClient();
  const refreshXp = useRefreshXp();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: PROGRESS_KEY }),
      qc.invalidateQueries({ queryKey: RECOMMENDED_KEY }),
      refreshXp(),
    ]);
}

export function useCompleteArticle() {
  const after = useAfterLearning();
  return useMutation({ mutationFn: (slug: string) => completeArticle(slug), onSuccess: after });
}

export function useSubmitQuiz() {
  const after = useAfterLearning();
  return useMutation({
    mutationFn: ({ slug, answers }: { slug: string; answers: number[] }) =>
      submitQuiz(slug, answers),
    onSuccess: after,
  });
}
