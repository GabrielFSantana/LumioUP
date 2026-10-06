export type ClubRole = 'owner' | 'admin' | 'member';

export const CLUB_ROLE_LABELS: Record<ClubRole, string> = {
  owner: 'Dono',
  admin: 'Admin',
  member: 'Membro',
};

/** Mesmos limites aplicados pelo banco (o app usa para orientar o usuário). */
export const CLUB_LIMITS = {
  ownedPerUser: 5,
  membershipsPerUser: 10,
  defaultMaxMembers: 20,
  nameMaxLength: 40,
  descriptionMaxLength: 200,
} as const;

/** Alfabeto do código: sem I, O, 0 e 1, para não confundir ao ler ou digitar. */
export const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
export const INVITE_LINK_PREFIX = 'lumioup://clube/entrar?codigo=';

/** "abcd-efgh " -> "ABCDEFGH" (ignora hífens, espaços e maiúsculas/minúsculas). */
export function normalizeInviteCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function isValidInviteCode(input: string): boolean {
  return INVITE_CODE_PATTERN.test(normalizeInviteCode(input));
}

/** "ABCDEFGH" -> "ABCD-EFGH" (só para exibição). */
export function formatInviteCode(code: string): string {
  const normalized = normalizeInviteCode(code);
  return normalized.length === 8 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
}

export function buildInviteLink(code: string): string {
  return `${INVITE_LINK_PREFIX}${normalizeInviteCode(code)}`;
}

/**
 * Extrai o código de um link de convite (`...?codigo=ABCD-EFGH`) ou de um código digitado.
 * Retorna null se não houver um código válido.
 */
export function extractInviteCode(text: string): string | null {
  const fromLink = /[?&]codigo=([^&#\s]+)/i.exec(text);
  const candidate = normalizeInviteCode(fromLink?.[1] ?? text);
  return INVITE_CODE_PATTERN.test(candidate) ? candidate : null;
}

/** Texto para compartilhar. Contém só o nome do clube e o código: nada financeiro. */
export function buildInviteMessage(clubName: string, code: string): string {
  return (
    `Venha para o meu clube "${clubName}" no LumioUP! ` +
    `Código: ${formatInviteCode(code)}. Ou abra: ${buildInviteLink(code)}`
  );
}

export function validateClubName(name: string): string | null {
  const value = name.trim();
  if (value === '') return 'Dê um nome ao clube.';
  if (value.length > CLUB_LIMITS.nameMaxLength) {
    return `Use até ${CLUB_LIMITS.nameMaxLength} caracteres.`;
  }
  return null;
}

export function validateClubDescription(description: string): string | null {
  if (description.trim().length > CLUB_LIMITS.descriptionMaxLength) {
    return `Use até ${CLUB_LIMITS.descriptionMaxLength} caracteres.`;
  }
  return null;
}

// ===== Permissões (espelham as regras do banco; o servidor é quem garante) =====

/** Editar nome, descrição e ligar/desligar a entrada por código. */
export const canEditClub = (role: ClubRole): boolean => role === 'owner' || role === 'admin';

/** Renovar o código de convite. */
export const canRegenerateCode = canEditClub;

/** Promover, rebaixar e transferir a propriedade: só o dono. */
export const canChangeRoles = (role: ClubRole): boolean => role === 'owner';
export const canTransferOwnership = canChangeRoles;
export const canDeleteClub = canChangeRoles;

/** Dono remove admins e membros; admin remove só membros; ninguém remove o dono. */
export function canRemoveMember(actor: ClubRole, target: ClubRole): boolean {
  if (target === 'owner') return false;
  if (actor === 'owner') return true;
  return actor === 'admin' && target === 'member';
}

/** O dono só sai sozinho se for o único membro (o clube é apagado); senão precisa transferir. */
export function leaveOutcome(
  role: ClubRole,
  memberCount: number,
): 'leave' | 'delete_club' | 'must_transfer' {
  if (role !== 'owner') return 'leave';
  return memberCount <= 1 ? 'delete_club' : 'must_transfer';
}

/** Rótulo e ações possíveis de um membro, para a tela de membros. */
export type MemberAction = 'promote' | 'demote' | 'transfer' | 'remove';

export function memberActions(actor: ClubRole, target: ClubRole, isSelf: boolean): MemberAction[] {
  if (isSelf || target === 'owner') return [];
  const actions: MemberAction[] = [];
  if (canChangeRoles(actor)) {
    actions.push(target === 'member' ? 'promote' : 'demote');
    actions.push('transfer');
  }
  if (canRemoveMember(actor, target)) actions.push('remove');
  return actions;
}
