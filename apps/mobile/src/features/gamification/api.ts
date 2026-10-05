import type { Level, MissionTemplate, UserMissionProgress } from '@lumioup/core';
import { supabase } from '../../lib/supabase';

export interface UserStats {
  totalXp: number;
  level: number;
  /** Último nível cuja comemoração o usuário já viu. */
  celebratedLevel: number;
  currentStreak: number;
  bestStreak: number;
  /** Último dia com atividade (dia em que a ação foi feita). */
  lastActiveOn: string | null;
}

export interface XpRule {
  source: string;
  xp: number;
  dailyCap: number | null;
  label: string;
  description: string;
  /** Regras com valor próprio por item (missões e conquistas). */
  variable: boolean;
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  xpReward: number;
}

export interface XpEvent {
  id: string;
  source: string;
  xp: number;
  awardedOn: string;
  createdAt: string;
}

/** Erro do banco com mensagem e código preservados. */
export class GamificationError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function fail(error: { message: string; code?: string }): never {
  throw new GamificationError(error.message, error.code);
}

export async function fetchLevels(): Promise<Level[]> {
  const { data, error } = await supabase
    .from('levels')
    .select('level, name, min_xp')
    .order('min_xp');
  if (error) fail(error);
  return data.map((row) => ({ level: row.level, name: row.name, minXp: row.min_xp }));
}

export async function fetchXpRules(): Promise<XpRule[]> {
  const { data, error } = await supabase
    .from('xp_rules')
    .select('source, xp, daily_cap, label, description, variable')
    .eq('enabled', true)
    .order('xp');
  if (error) fail(error);
  return data.map((row) => ({
    source: row.source,
    xp: row.xp,
    dailyCap: row.daily_cap,
    label: row.label,
    description: row.description,
    variable: row.variable,
  }));
}

/** Sem linha de estatísticas (ainda não há XP), vale zero no nível 1. */
export async function fetchUserStats(): Promise<UserStats> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('total_xp, level, celebrated_level, current_streak, best_streak, last_active_on')
    .maybeSingle();
  if (error) fail(error);
  return {
    totalXp: data?.total_xp ?? 0,
    level: data?.level ?? 1,
    celebratedLevel: data?.celebrated_level ?? 1,
    currentStreak: data?.current_streak ?? 0,
    bestStreak: data?.best_streak ?? 0,
    lastActiveOn: data?.last_active_on ?? null,
  };
}

export async function fetchXpEvents(limit = 30): Promise<XpEvent[]> {
  const { data, error } = await supabase
    .from('xp_events')
    .select('id, source, xp, awarded_on, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) fail(error);
  return data.map((row) => ({
    id: row.id,
    source: row.source,
    xp: row.xp,
    awardedOn: row.awarded_on,
    createdAt: row.created_at,
  }));
}

export async function acknowledgeLevel(): Promise<void> {
  const { error } = await supabase.rpc('acknowledge_level');
  if (error) fail(error);
}

/** Dias com atividade a partir de `from` (YYYY-MM-DD). */
export async function fetchActivityDays(from: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('activity_days')
    .select('day')
    .gte('day', from)
    .order('day');
  if (error) fail(error);
  return data.map((row) => row.day);
}

export async function fetchMissionTemplates(): Promise<MissionTemplate[]> {
  const { data, error } = await supabase
    .from('mission_templates')
    .select('code, period, title, description, target, xp_reward, sort_order')
    .eq('enabled', true)
    .order('sort_order');
  if (error) fail(error);
  return data.map((row) => ({
    code: row.code,
    period: row.period as MissionTemplate['period'],
    title: row.title,
    description: row.description,
    target: row.target,
    xpReward: row.xp_reward,
    sortOrder: row.sort_order,
  }));
}

/** Progresso das missões dos períodos a partir de `from` (início da semana atual). */
export async function fetchUserMissions(from: string): Promise<UserMissionProgress[]> {
  const { data, error } = await supabase
    .from('user_missions')
    .select('template_code, period_start, progress, completed_at')
    .gte('period_start', from);
  if (error) fail(error);
  return data.map((row) => ({
    templateCode: row.template_code,
    periodStart: row.period_start,
    progress: row.progress,
    completedAt: row.completed_at,
  }));
}

export async function fetchAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('code, name, description, icon, color, xp_reward')
    .eq('enabled', true)
    .order('sort_order');
  if (error) fail(error);
  return data.map((row) => ({
    code: row.code,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color,
    xpReward: row.xp_reward,
  }));
}

/** Conquistas desbloqueadas pelo usuário: código e data. */
export async function fetchUnlockedAchievements(): Promise<{ code: string; unlockedAt: string }[]> {
  const { data, error } = await supabase.from('user_achievements').select('code, unlocked_at');
  if (error) fail(error);
  return data.map((row) => ({ code: row.code, unlockedAt: row.unlocked_at }));
}
