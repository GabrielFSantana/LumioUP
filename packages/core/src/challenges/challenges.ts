import type { ClubRole } from '../clubs/clubs';

/** Desafios medem ações, nunca valores em reais. */
export type ChallengeKind = 'log_days' | 'log_count' | 'goal_contributions';
export type ChallengeStatus = 'upcoming' | 'active' | 'ended';
export type RankingPeriod = 'week' | 'month' | 'all';

/** Mesmos limites aplicados pelo banco (o app usa para orientar o usuário). */
export const CHALLENGE_LIMITS = {
  titleMaxLength: 60,
  maxDurationDays: 90,
  activePerClub: 5,
  maxTarget: 100,
} as const;

interface KindInfo {
  label: string;
  description: string;
  /** Ex.: "dias" -> "3 de 10 dias". */
  unitSingular: string;
  unitPlural: string;
  minTarget: number;
}

export const CHALLENGE_KINDS: Record<ChallengeKind, KindInfo> = {
  log_days: {
    label: 'Dias organizados',
    description: 'Ter atividade no app em vários dias do período.',
    unitSingular: 'dia',
    unitPlural: 'dias',
    minTarget: 3,
  },
  log_count: {
    label: 'Lançamentos registrados',
    description: 'Registrar lançamentos ao longo do período (até 5 por dia contam).',
    unitSingular: 'lançamento',
    unitPlural: 'lançamentos',
    minTarget: 5,
  },
  goal_contributions: {
    label: 'Guardar para metas',
    description: 'Fazer contribuições em metas (até 2 por dia contam).',
    unitSingular: 'contribuição',
    unitPlural: 'contribuições',
    minTarget: 2,
  },
};

export const CHALLENGE_KIND_ORDER: ChallengeKind[] = [
  'log_days',
  'log_count',
  'goal_contributions',
];

export const RANKING_PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'all', label: 'Geral' },
];

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const ms = toUtcMs(value);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

/** Dias corridos de `from` até `to` (negativo se `to` é anterior). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** Quantidade de dias do desafio, contando o primeiro e o último. */
export function challengeDuration(startsOn: string, endsOn: string): number {
  return daysBetween(startsOn, endsOn) + 1;
}

export function challengeStatus(today: string, startsOn: string, endsOn: string): ChallengeStatus {
  if (today > endsOn) return 'ended';
  if (today < startsOn) return 'upcoming';
  return 'active';
}

/** Dias restantes contando hoje (0 se já terminou). */
export function daysLeft(today: string, endsOn: string): number {
  return Math.max(0, daysBetween(today, endsOn) + 1);
}

/** Percentual de 0 a 100, sempre inteiro (arredonda para baixo, como o servidor). */
export function progressPct(count: number, target: number): number {
  if (target <= 0 || count <= 0) return 0;
  return Math.min(100, Math.floor((count * 100) / target));
}

export function progressLabel(kind: ChallengeKind, count: number, target: number): string {
  const info = CHALLENGE_KINDS[kind];
  return `${Math.min(count, target)} de ${target} ${target === 1 ? info.unitSingular : info.unitPlural}`;
}

export function targetRange(
  kind: ChallengeKind,
  durationDays: number,
): { min: number; max: number } {
  const min = CHALLENGE_KINDS[kind].minTarget;
  const max =
    kind === 'log_days'
      ? Math.min(CHALLENGE_LIMITS.maxTarget, Math.max(durationDays, 0))
      : CHALLENGE_LIMITS.maxTarget;
  return { min, max };
}

export interface ChallengeDraft {
  kind: ChallengeKind;
  title: string;
  startsOn: string;
  endsOn: string;
  target: number;
}

export interface ChallengeErrors {
  title?: string;
  dates?: string;
  target?: string;
}

/** Valida o rascunho com as mesmas regras do banco. Retorna `null` se estiver tudo certo. */
export function validateChallenge(draft: ChallengeDraft, today: string): ChallengeErrors | null {
  const errors: ChallengeErrors = {};
  const title = draft.title.trim();
  if (title === '') errors.title = 'Dê um nome ao desafio.';
  else if (title.length > CHALLENGE_LIMITS.titleMaxLength) {
    errors.title = `Use até ${CHALLENGE_LIMITS.titleMaxLength} caracteres.`;
  }

  const validDates = isIsoDate(draft.startsOn) && isIsoDate(draft.endsOn);
  if (!validDates) errors.dates = 'Informe as datas no formato AAAA-MM-DD.';
  else if (draft.startsOn < today) errors.dates = 'O desafio não pode começar no passado.';
  else if (draft.endsOn < draft.startsOn) errors.dates = 'O fim precisa ser depois do início.';
  else if (challengeDuration(draft.startsOn, draft.endsOn) > CHALLENGE_LIMITS.maxDurationDays) {
    errors.dates = `A duração máxima é de ${CHALLENGE_LIMITS.maxDurationDays} dias.`;
  }

  const duration =
    validDates && !errors.dates ? challengeDuration(draft.startsOn, draft.endsOn) : 0;
  const { min, max } = targetRange(draft.kind, validDates ? duration : CHALLENGE_LIMITS.maxTarget);
  if (!Number.isInteger(draft.target) || draft.target < min || draft.target > max) {
    errors.target =
      draft.kind === 'log_days' && validDates && duration > 0 && max < min
        ? 'O período é curto demais para esse tipo de desafio.'
        : `A meta deve ficar entre ${min} e ${max}.`;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export function canCreateChallenge(role: ClubRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canDeleteChallenge(role: ClubRole, isCreator: boolean): boolean {
  return role === 'owner' || role === 'admin' || isCreator;
}
