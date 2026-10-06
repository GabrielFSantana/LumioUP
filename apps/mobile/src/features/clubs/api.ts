import type { ClubRole } from '@lumioup/core';
import { supabase } from '../../lib/supabase';

export interface ClubSummary {
  clubId: string;
  name: string;
  description: string | null;
  role: ClubRole;
  memberCount: number;
  inviteCode: string;
  invitesEnabled: boolean;
  maxMembers: number;
}

export interface ClubMember {
  profileId: string;
  displayName: string;
  role: ClubRole;
  joinedAt: string;
  /** Nulos quando a pessoa escolheu não aparecer no ranking. Nunca há valores em reais. */
  level: number | null;
  totalXp: number | null;
  currentStreak: number | null;
}

export interface ClubPreview {
  clubId: string;
  name: string;
  memberCount: number;
  maxMembers: number;
  isFull: boolean;
  invitesEnabled: boolean;
}

/** Erro do banco com mensagem e código preservados, para tradução amigável. */
export class ClubError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function fail(error: { message: string; code?: string }): never {
  throw new ClubError(error.message, error.code);
}

export async function listMyClubs(): Promise<ClubSummary[]> {
  const { data, error } = await supabase.rpc('list_my_clubs');
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    clubId: row.club_id,
    name: row.name,
    description: row.description,
    role: row.role as ClubRole,
    memberCount: row.member_count,
    inviteCode: row.invite_code,
    invitesEnabled: row.invites_enabled,
    maxMembers: row.max_members,
  }));
}

export async function listClubMembers(clubId: string): Promise<ClubMember[]> {
  const { data, error } = await supabase.rpc('list_club_members', { p_club: clubId });
  if (error) fail(error);
  return (data ?? []).map((row) => ({
    profileId: row.profile_id,
    displayName: row.display_name,
    role: row.role as ClubRole,
    joinedAt: row.joined_at,
    level: row.level,
    totalXp: row.total_xp,
    currentStreak: row.current_streak,
  }));
}

/** Nome e lotação de um clube a partir do código. Null = código não encontrado. */
export async function previewClub(code: string): Promise<ClubPreview | null> {
  const { data, error } = await supabase.rpc('preview_club', { p_code: code });
  if (error) fail(error);
  const row = data?.[0];
  if (!row) return null;
  return {
    clubId: row.club_id,
    name: row.name,
    memberCount: row.member_count,
    maxMembers: row.max_members,
    isFull: row.is_full,
    invitesEnabled: row.invites_enabled,
  };
}

/** Entra no clube; devolve o id, ou null se o código não existe. */
export async function joinClub(code: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('join_club', { p_code: code });
  if (error) fail(error);
  return data;
}

export async function createClub(name: string, description: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_club', {
    p_name: name,
    p_description: description,
  });
  if (error) fail(error);
  return data;
}

export async function updateClub(
  clubId: string,
  input: { name: string; description: string; invitesEnabled: boolean },
): Promise<void> {
  const { error } = await supabase.rpc('update_club', {
    p_club: clubId,
    p_name: input.name,
    p_description: input.description,
    p_invites_enabled: input.invitesEnabled,
  });
  if (error) fail(error);
}

export async function regenerateInviteCode(clubId: string): Promise<string> {
  const { data, error } = await supabase.rpc('regenerate_invite_code', { p_club: clubId });
  if (error) fail(error);
  return data;
}

export async function deleteClub(clubId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_club', { p_club: clubId });
  if (error) fail(error);
}

export async function leaveClub(clubId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_club', { p_club: clubId });
  if (error) fail(error);
}

export async function removeMember(clubId: string, profileId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_member', { p_club: clubId, p_profile: profileId });
  if (error) fail(error);
}

export async function setMemberRole(
  clubId: string,
  profileId: string,
  role: 'admin' | 'member',
): Promise<void> {
  const { error } = await supabase.rpc('set_member_role', {
    p_club: clubId,
    p_profile: profileId,
    p_role: role,
  });
  if (error) fail(error);
}

export async function transferOwnership(clubId: string, profileId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_ownership', {
    p_club: clubId,
    p_profile: profileId,
  });
  if (error) fail(error);
}

/** Mensagens simples e sem culpa para os erros de clube. */
export function friendlyClubError(error: unknown): string {
  const text = error instanceof Error ? error.message : '';
  if (text.includes('too_many_attempts')) {
    return 'Muitas tentativas com códigos que não existem. Tente de novo em cerca de uma hora.';
  }
  if (text.includes('club_full')) return 'Esse clube está cheio no momento.';
  if (text.includes('invites_disabled')) return 'A entrada por código está desligada neste clube.';
  if (text.includes('owner_must_transfer')) {
    return 'Passe a propriedade para outra pessoa antes de sair.';
  }
  if (text.includes('club_limit_owned')) return 'Você chegou ao limite de clubes que pode criar.';
  if (text.includes('club_limit_member'))
    return 'Você chegou ao limite de clubes que pode participar.';
  if (text.includes('invalid_name')) return 'Dê um nome ao clube (até 40 caracteres).';
  if (text.includes('invalid_description')) return 'A descrição passou de 200 caracteres.';
  if (text.includes('not_a_member')) return 'Você não faz mais parte deste clube.';
  if (text.includes('not_allowed')) return 'Você não tem permissão para fazer isso.';
  if (text.toLowerCase().includes('fetch') || text.toLowerCase().includes('network')) {
    return 'Sem conexão no momento. Verifique sua internet.';
  }
  return 'Algo deu errado. Tente novamente em instantes.';
}
