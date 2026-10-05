import { addDays } from '../finance/dates';
import { periodFor, weekdayOf } from '../finance/periods';
import type { DateString } from '../finance/types';

export type StreakState = 'none' | 'active' | 'at_risk' | 'broken';

interface StreakInput {
  currentStreak: number;
  /** Último dia com atividade (dia em que a ação foi feita), ou null se nunca houve. */
  lastActiveOn: DateString | null;
  today: DateString;
}

/**
 * Situação da sequência hoje:
 * active (já teve atividade hoje), at_risk (último dia foi ontem: continua se registrar hoje),
 * broken (passou mais de um dia) ou none (nunca começou).
 */
export function streakState({ currentStreak, lastActiveOn, today }: StreakInput): StreakState {
  if (!lastActiveOn || currentStreak <= 0) return 'none';
  if (lastActiveOn === today) return 'active';
  if (lastActiveOn === addDays(today, -1)) return 'at_risk';
  return 'broken';
}

/** Dias de sequência a mostrar: zero quando já quebrou (o banco só zera na próxima atividade). */
export function effectiveStreak(input: StreakInput): number {
  const state = streakState(input);
  return state === 'active' || state === 'at_risk' ? input.currentStreak : 0;
}

/** Mensagem neutra e sem culpa sobre a sequência. */
export function describeStreak(state: StreakState, days: number): string {
  switch (state) {
    case 'none':
      return 'Registre algo hoje para começar sua sequência.';
    case 'active':
      return days === 1 ? '1 dia organizado. Bom começo!' : `${days} dias organizados seguidos.`;
    case 'at_risk':
      return `Sua sequência de ${days} ${days === 1 ? 'dia continua' : 'dias continua'} se você registrar algo hoje.`;
    case 'broken':
      return 'Sua sequência recomeça hoje. Quando quiser!';
  }
}

/** Índices (0 = domingo ... 6 = sábado) dos dias da semana de `today` com atividade. */
export function weekActiveIndexes(activeDays: readonly DateString[], today: DateString): number[] {
  const week = periodFor('week', today);
  const indexes = new Set<number>();
  for (const day of activeDays) {
    if (day >= week.from && day <= week.to) indexes.add(weekdayOf(day));
  }
  return [...indexes].sort((a, b) => a - b);
}

export type MissionPeriod = 'daily' | 'weekly';

export interface MissionTemplate {
  code: string;
  period: MissionPeriod;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  sortOrder: number;
}

export interface UserMissionProgress {
  templateCode: string;
  /** Dia (diária) ou domingo da semana (semanal) a que o progresso se refere. */
  periodStart: DateString;
  progress: number;
  completedAt: string | null;
}

export interface MissionRow {
  template: MissionTemplate;
  progress: number;
  completed: boolean;
  /** 0 a 100, arredondado para baixo; 100 só ao concluir. */
  percent: number;
}

/** Início do período atual de uma missão: hoje (diária) ou o domingo da semana (semanal). */
export function missionPeriodStart(period: MissionPeriod, today: DateString): DateString {
  return period === 'daily' ? today : periodFor('week', today).from;
}

/** Linhas de missões do período atual: diárias primeiro; sem registro = progresso zero. */
export function buildMissionRows(
  templates: readonly MissionTemplate[],
  progressRows: readonly UserMissionProgress[],
  today: DateString,
): MissionRow[] {
  const rows = templates.map((template): MissionRow => {
    const start = missionPeriodStart(template.period, today);
    const found = progressRows.find(
      (p) => p.templateCode === template.code && p.periodStart === start,
    );
    const progress = found?.progress ?? 0;
    const completed = Boolean(found?.completedAt);
    return {
      template,
      progress,
      completed,
      percent: completed ? 100 : Math.min(99, Math.floor((progress / template.target) * 100)),
    };
  });
  const order = (r: MissionRow) => (r.template.period === 'daily' ? 0 : 1);
  return rows.sort((a, b) => order(a) - order(b) || a.template.sortOrder - b.template.sortOrder);
}

export interface AchievementSummary {
  unlocked: number;
  total: number;
}

export function summarizeAchievements(
  catalog: readonly { code: string }[],
  unlockedCodes: readonly string[],
): AchievementSummary {
  const unlocked = new Set(unlockedCodes);
  return { unlocked: catalog.filter((a) => unlocked.has(a.code)).length, total: catalog.length };
}
