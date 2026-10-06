import { addDays } from '../finance/dates';
import { weekdayOf } from '../finance/periods';
import type { DateString } from '../finance/types';

/**
 * Lembretes LOCAIS: o celular agenda e dispara, sem servidor de envio. Os textos são genéricos
 * (sem nome de meta e sem valores), porque notificações aparecem na tela bloqueada.
 * O planejador é puro: recebe o "agora" e devolve exatamente o que agendar.
 */

export type NotificationKind = 'daily' | 'weekly' | 'goal' | 'missions' | 'monthly';

export interface NotificationPrefs {
  dailyReminder: boolean;
  /** "HH:MM", entre 07:00 e 22:00. */
  dailyTime: string;
  weeklyReview: boolean;
  goalDeadlines: boolean;
  missions: boolean;
  monthlySummary: boolean;
}

/** Tudo desligado: ninguém é incomodado sem pedir. */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  dailyReminder: false,
  dailyTime: '20:00',
  weeklyReview: false,
  goalDeadlines: false,
  missions: false,
  monthlySummary: false,
};

/** Horários oferecidos no app para o lembrete diário. */
export const DAILY_TIME_OPTIONS = ['08:00', '12:00', '18:00', '20:00', '21:00'] as const;

/** Mesma regra do banco: de 07:00 a 22:00. */
export function isValidNotificationTime(value: string): boolean {
  if (value === '22:00') return true;
  return /^(0[7-9]|1[0-9]|2[0-1]):[0-5][0-9]$/.test(value);
}

export interface LocalMoment {
  date: DateString;
  hour: number;
  minute: number;
}

export interface PlannedNotification {
  /** Estável: o mesmo lembrete tem sempre o mesmo id. */
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Tela aberta ao tocar na notificação. */
  route: string;
  at: LocalMoment;
}

export interface GoalDeadline {
  id: string;
  deadline: DateString;
}

export interface PlanInput {
  prefs: NotificationPrefs;
  now: LocalMoment;
  /** Já registrou algo hoje? Então o lembrete de hoje não é necessário. */
  activeToday: boolean;
  /** Metas ativas com prazo. */
  goals: readonly GoalDeadline[];
}

/** Limites para não ser excessivo (e ficar abaixo do teto de agendamentos dos celulares). */
export const NOTIFICATION_LIMITS = {
  /** Quantos dias à frente os lembretes diários são agendados (quem some recebe no máximo isso). */
  dailyDaysAhead: 3,
  weeklyAhead: 2,
  goalLeadDays: 3,
  maxGoals: 5,
} as const;

const MISSIONS_TIME = { hour: 9, minute: 0 };
const WEEKLY_TIME = { hour: 18, minute: 0 };
const MONTHLY_TIME = { hour: 9, minute: 0 };
const GOAL_TIME = { hour: 9, minute: 0 };

const TEXTS = {
  daily: {
    title: 'Hora de registrar?',
    body: 'Anote o que aconteceu hoje. Leva menos de um minuto.',
    route: '/lancamento-form',
  },
  missions: {
    title: 'Missões do dia',
    body: 'Tem missões novas esperando por você.',
    route: '/xp',
  },
  weekly: {
    title: 'Revisão da semana',
    body: 'Dê uma olhada no resumo da semana e ajuste o que fizer sentido.',
    route: '/relatorios',
  },
  goal: {
    title: 'Meta com prazo chegando',
    body: 'Uma das suas metas vence em breve. Vale conferir o progresso.',
    route: '/metas',
  },
  monthly: {
    title: 'Seu mês em resumo',
    body: 'Veja como foi o mês nos relatórios.',
    route: '/relatorios',
  },
} as const;

function compare(a: LocalMoment, b: LocalMoment): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.hour !== b.hour) return a.hour - b.hour;
  return a.minute - b.minute;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number) as [number, number];
  return { hour, minute };
}

function firstOfNextMonth(date: DateString): DateString {
  const [y, m] = date.split('-').map(Number) as [number, number];
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

/** Lista o que agendar agora, em ordem cronológica. Só entram lembretes no futuro. */
export function planNotifications(input: PlanInput): PlannedNotification[] {
  const { prefs, now, activeToday, goals } = input;
  const out: PlannedNotification[] = [];
  const add = (
    kind: NotificationKind,
    id: string,
    at: LocalMoment,
    text: { title: string; body: string; route: string },
  ) => {
    if (compare(at, now) <= 0) return;
    out.push({ id, kind, at, ...text });
  };

  for (let offset = 0; offset < NOTIFICATION_LIMITS.dailyDaysAhead; offset++) {
    const date = addDays(now.date, offset);

    if (prefs.dailyReminder && isValidNotificationTime(prefs.dailyTime)) {
      if (!(offset === 0 && activeToday)) {
        add('daily', `daily:${date}`, { date, ...parseTime(prefs.dailyTime) }, TEXTS.daily);
      }
    }
    if (prefs.missions) {
      add('missions', `missions:${date}`, { date, ...MISSIONS_TIME }, TEXTS.missions);
    }
  }

  if (prefs.weeklyReview) {
    // Domingo, 18:00: os próximos domingos a partir de hoje.
    const untilSunday = (7 - weekdayOf(now.date)) % 7;
    let scheduled = 0;
    for (let i = 0; scheduled < NOTIFICATION_LIMITS.weeklyAhead; i++) {
      const at = { date: addDays(now.date, untilSunday + i * 7), ...WEEKLY_TIME };
      if (compare(at, now) <= 0) continue;
      add('weekly', `weekly:${at.date}`, at, TEXTS.weekly);
      scheduled++;
    }
  }

  if (prefs.monthlySummary) {
    // Dia 1º, 09:00: hoje (se for dia 1 e ainda não passou) ou o do próximo mês.
    const thisMonth = `${now.date.slice(0, 8)}01`;
    const date =
      compare({ date: thisMonth, ...MONTHLY_TIME }, now) > 0
        ? thisMonth
        : firstOfNextMonth(now.date);
    add('monthly', `monthly:${date}`, { date, ...MONTHLY_TIME }, TEXTS.monthly);
  }

  if (prefs.goalDeadlines) {
    const upcoming = goals
      .map((goal) => ({
        goal,
        date: addDays(goal.deadline, -NOTIFICATION_LIMITS.goalLeadDays),
      }))
      .filter(({ goal }) => goal.deadline >= now.date)
      .sort((a, b) =>
        a.date < b.date ? -1 : a.date > b.date ? 1 : a.goal.id.localeCompare(b.goal.id),
      );
    for (const { goal, date } of upcoming.slice(0, NOTIFICATION_LIMITS.maxGoals)) {
      add('goal', `goal:${goal.id}:${goal.deadline}`, { date, ...GOAL_TIME }, TEXTS.goal);
    }
  }

  return out.sort((a, b) => compare(a.at, b.at) || a.id.localeCompare(b.id));
}
