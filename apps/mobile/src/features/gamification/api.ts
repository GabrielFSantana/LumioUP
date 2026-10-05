import type { Level } from '@lumioup/core';
import { supabase } from '../../lib/supabase';

export interface UserStats {
  totalXp: number;
  level: number;
  /** Último nível cuja comemoração o usuário já viu. */
  celebratedLevel: number;
}

export interface XpRule {
  source: string;
  xp: number;
  dailyCap: number | null;
  label: string;
  description: string;
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
    .select('source, xp, daily_cap, label, description')
    .eq('enabled', true)
    .order('xp');
  if (error) fail(error);
  return data.map((row) => ({
    source: row.source,
    xp: row.xp,
    dailyCap: row.daily_cap,
    label: row.label,
    description: row.description,
  }));
}

/** Sem linha de estatísticas (ainda não há XP), vale zero no nível 1. */
export async function fetchUserStats(): Promise<UserStats> {
  const { data, error } = await supabase
    .from('user_stats')
    .select('total_xp, level, celebrated_level')
    .maybeSingle();
  if (error) fail(error);
  return {
    totalXp: data?.total_xp ?? 0,
    level: data?.level ?? 1,
    celebratedLevel: data?.celebrated_level ?? 1,
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
