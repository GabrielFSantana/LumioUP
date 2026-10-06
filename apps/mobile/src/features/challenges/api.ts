import type { ChallengeKind, ChallengeStatus, RankingPeriod } from '@lumioup/core';
import { supabase } from '../../lib/supabase';

export interface Challenge {
  id: string;
  kind: ChallengeKind;
  title: string;
  startsOn: string;
  endsOn: string;
  target: number;
  createdBy: string | null;
  status: ChallengeStatus;
  participantCount: number;
  completedCount: number;
  joined: boolean;
  /** Ações feitas pela própria pessoa (nunca valores em reais). */
  myCount: number;
  myCompletedAt: string | null;
}

export interface ChallengeStanding {
  profileId: string;
  displayName: string;
  actionCount: number;
  progressPct: number;
  completed: boolean;
  isSelf: boolean;
}

export interface RankingRow {
  profileId: string;
  displayName: string;
  xp: number;
  level: number;
  currentStreak: number;
  missionsCompleted: number;
  achievements: number;
  /** Nulo quando a pessoa escolheu não aparecer no ranking (só ela vê a própria linha). */
  rank: number | null;
  isSelf: boolean;
}

export interface NewChallenge {
  clubId: string;
  kind: ChallengeKind;
  title: string;
  startsOn: string;
  endsOn: string;
  target: number;
}

export class ChallengeError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function fail(error: { message: string; code?: string }): never {
  throw new ChallengeError(error.message, error.code);
}

export async function listChallenges(clubId: string): Promise<Challenge[]> {
  const { data, error } = await supabase.rpc('list_challenges', { p_club: clubId });
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as ChallengeKind,
    title: row.title,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    target: row.target,
    createdBy: row.created_by,
    status: row.status as ChallengeStatus,
    participantCount: row.participant_count,
    completedCount: row.completed_count,
    joined: row.joined,
    myCount: row.my_count,
    myCompletedAt: row.my_completed_at,
  }));
}

export async function challengeStandings(challengeId: string): Promise<ChallengeStanding[]> {
  const { data, error } = await supabase.rpc('challenge_standings', { p_challenge: challengeId });
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    profileId: row.profile_id,
    displayName: row.display_name,
    actionCount: row.action_count,
    progressPct: row.progress_pct,
    completed: row.completed,
    isSelf: row.is_self,
  }));
}

export async function clubRanking(clubId: string, period: RankingPeriod): Promise<RankingRow[]> {
  const { data, error } = await supabase.rpc('club_ranking', { p_club: clubId, p_period: period });
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    profileId: row.profile_id,
    displayName: row.display_name,
    xp: row.xp,
    level: row.level,
    currentStreak: row.current_streak,
    missionsCompleted: row.missions_completed,
    achievements: row.achievements,
    rank: row.rank,
    isSelf: row.is_self,
  }));
}

export async function createChallenge(input: NewChallenge): Promise<string> {
  const { data, error } = await supabase.rpc('create_challenge', {
    p_club: input.clubId,
    p_kind: input.kind,
    p_title: input.title,
    p_starts_on: input.startsOn,
    p_ends_on: input.endsOn,
    p_target: input.target,
  });
  if (error) fail(error);
  return data;
}

export async function joinChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.rpc('join_challenge', { p_challenge: challengeId });
  if (error) fail(error);
}

export async function leaveChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_challenge', { p_challenge: challengeId });
  if (error) fail(error);
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_challenge', { p_challenge: challengeId });
  if (error) fail(error);
}

/** Mensagens simples e sem culpa para os erros de desafio. */
export function friendlyChallengeError(error: unknown): string {
  const text = error instanceof Error ? error.message : '';
  if (text.includes('too_many_challenges')) {
    return 'Este clube já tem 5 desafios ativos ou marcados. Espere algum terminar ou apague um.';
  }
  if (text.includes('invalid_title')) return 'Dê um nome ao desafio (até 60 caracteres).';
  if (text.includes('invalid_dates')) {
    return 'Confira as datas: começa hoje ou depois, e dura no máximo 90 dias.';
  }
  if (text.includes('invalid_target')) return 'A meta não é válida para esse tipo e período.';
  if (text.includes('invalid_kind')) return 'Escolha um tipo de desafio.';
  if (text.includes('challenge_ended')) return 'Esse desafio já terminou.';
  if (text.includes('not_a_member')) return 'Você não faz mais parte deste clube.';
  if (text.includes('not_allowed')) return 'Você não tem permissão para fazer isso.';
  if (text.toLowerCase().includes('fetch') || text.toLowerCase().includes('network')) {
    return 'Sem conexão no momento. Verifique sua internet.';
  }
  return 'Algo deu errado. Tente novamente em instantes.';
}
