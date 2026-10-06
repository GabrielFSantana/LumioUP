import { supabase } from '../../lib/supabase';

export const TRACK_SLUG = 'primeiros-passos';

export interface ArticleSummary {
  slug: string;
  topic: string;
  level: 'beginner' | 'intermediate';
  title: string;
  summary: string;
  readMinutes: number;
}

export interface Article extends ArticleSummary {
  body: string;
}

export interface Track {
  slug: string;
  title: string;
  description: string;
  /** Slugs dos artigos, na ordem da trilha. */
  articleSlugs: string[];
}

export interface ArticleProgress {
  articleSlug: string;
  completedAt: string | null;
  quizBestPct: number | null;
  quizPassedAt: string | null;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  topic: string;
}

/** Pergunta do quiz: o gabarito não vem do banco, só depois de responder. */
export interface QuizQuestion {
  position: number;
  prompt: string;
  options: string[];
}

export interface QuizAnswerResult {
  position: number;
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
}

export interface Recommendation {
  articleSlug: string;
  reason: string;
}

export class EducationError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function fail(error: { message: string; code?: string }): never {
  throw new EducationError(error.message, error.code);
}

const SUMMARY_COLUMNS = 'slug, topic, level, title, summary, read_minutes';

function toSummary(row: {
  slug: string;
  topic: string;
  level: string;
  title: string;
  summary: string;
  read_minutes: number;
}): ArticleSummary {
  return {
    slug: row.slug,
    topic: row.topic,
    level: row.level as ArticleSummary['level'],
    title: row.title,
    summary: row.summary,
    readMinutes: row.read_minutes,
  };
}

export async function listArticles(): Promise<ArticleSummary[]> {
  const { data, error } = await supabase
    .from('articles')
    .select(SUMMARY_COLUMNS)
    .order('sort_order');
  if (error) fail(error);
  return (data ?? []).map(toSummary);
}

export async function getArticle(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select(`${SUMMARY_COLUMNS}, body`)
    .eq('slug', slug)
    .maybeSingle();
  if (error) fail(error);
  return data ? { ...toSummary(data), body: data.body } : null;
}

export async function getTrack(slug: string): Promise<Track | null> {
  const [track, items] = await Promise.all([
    supabase
      .from('learning_tracks')
      .select('slug, title, description')
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .from('track_items')
      .select('article_slug, position')
      .eq('track_slug', slug)
      .order('position'),
  ]);
  if (track.error) fail(track.error);
  if (items.error) fail(items.error);
  if (!track.data) return null;
  return {
    slug: track.data.slug,
    title: track.data.title,
    description: track.data.description,
    articleSlugs: (items.data ?? []).map((item) => item.article_slug),
  };
}

export async function listProgress(): Promise<ArticleProgress[]> {
  const { data, error } = await supabase
    .from('article_progress')
    .select('article_slug, completed_at, quiz_best_pct, quiz_passed_at');
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    articleSlug: row.article_slug,
    completedAt: row.completed_at,
    quizBestPct: row.quiz_best_pct,
    quizPassedAt: row.quiz_passed_at,
  }));
}

export async function listGlossary(): Promise<GlossaryEntry[]> {
  const { data, error } = await supabase
    .from('glossary_terms')
    .select('term, definition, topic')
    .order('sort_order');
  if (error) fail(error);
  return data ?? [];
}

export async function listQuizQuestions(slug: string): Promise<QuizQuestion[]> {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('position, prompt, options')
    .eq('article_slug', slug)
    .order('position');
  if (error) fail(error);
  return data ?? [];
}

export async function completeArticle(slug: string): Promise<void> {
  const { error } = await supabase.rpc('complete_article', { p_article: slug });
  if (error) fail(error);
}

export async function submitQuiz(slug: string, answers: number[]): Promise<QuizAnswerResult[]> {
  const { data, error } = await supabase.rpc('submit_quiz', {
    p_article: slug,
    p_answers: answers,
  });
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    position: row.question_position,
    isCorrect: row.is_correct,
    correctIndex: row.correct_index,
    explanation: row.explanation,
  }));
}

export async function recommendedArticles(): Promise<Recommendation[]> {
  const { data, error } = await supabase.rpc('recommended_articles');
  if (error) fail(error);
  return (data ?? []).map((row) => ({ articleSlug: row.article_slug, reason: row.reason }));
}

export function friendlyEducationError(error: unknown): string {
  const text = error instanceof Error ? error.message : '';
  if (text.includes('article_not_found') || text.includes('quiz_not_found')) {
    return 'Esse conteúdo não está mais disponível.';
  }
  if (text.includes('invalid_answers')) return 'Responda todas as perguntas antes de enviar.';
  if (text.toLowerCase().includes('fetch') || text.toLowerCase().includes('network')) {
    return 'Sem conexão no momento. Verifique sua internet.';
  }
  return 'Algo deu errado. Tente novamente em instantes.';
}
