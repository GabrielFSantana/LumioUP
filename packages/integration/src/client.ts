import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Lê uma variável do ambiente ou, na falta, do `apps/mobile/.env` (valores locais, nunca segredos). */
function setting(name: string): string {
  const fromEnv = process.env[name];
  if (fromEnv) return fromEnv;
  try {
    const file = readFileSync(join(__dirname, '../../../apps/mobile/.env'), 'utf8');
    const match = new RegExp(`^${name}=(.+)$`, 'm').exec(file);
    if (match?.[1]) return match[1].trim();
  } catch {
    // sem arquivo: cai no erro abaixo
  }
  throw new Error(
    `Defina ${name} (ou crie apps/mobile/.env). Com o Supabase local: "npx supabase status -o env".`,
  );
}

export const SUPABASE_URL = process.env['SUPABASE_URL'] ?? setting('EXPO_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY =
  process.env['SUPABASE_ANON_KEY'] ?? setting('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export type Client = SupabaseClient;

export function newClient(): Client {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export interface TestUser {
  client: Client;
  id: string;
  email: string;
  password: string;
  name: string;
}

const PASSWORD = 'senhaJornada123';

/** Cria uma conta nova (e-mail único por execução) como o app faz: nome e aceite dos termos. */
export async function signUpUser(name: string): Promise<TestUser> {
  const email = `jornada-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@lumioup.test`;
  const client = newClient();
  const { data, error } = await client.auth.signUp({
    email,
    password: PASSWORD,
    options: { data: { display_name: name, accepted_terms_version: '2026-10' } },
  });
  if (error || !data.user || !data.session) {
    throw new Error(
      `Cadastro falhou: ${error?.message ?? 'sem sessão (confirmação de e-mail ligada?)'}`,
    );
  }
  return { client, id: data.user.id, email, password: PASSWORD, name };
}

/** Data de hoje no fuso padrão do perfil (America/Sao_Paulo), como o servidor calcula. */
export function todayInSaoPaulo(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Resultado de uma chamada ao banco: falha com a mensagem real se houver erro. */
export function ok<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`${what}: resposta vazia`);
  return result.data as NonNullable<T>;
}
