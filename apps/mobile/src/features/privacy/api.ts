import type { ExportLike } from '@lumioup/core';
import { supabase } from '../../lib/supabase';

export interface ConsentRecord {
  type: string;
  version: string;
  acceptedAt: string;
}

/** Tudo que a exportação traz (o servidor monta; aqui só tipamos o que o app usa). */
export type ExportedData = ExportLike & Record<string, unknown>;

export class PrivacyError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

export async function listConsents(): Promise<ConsentRecord[]> {
  const { data, error } = await supabase
    .from('consents')
    .select('type, version, accepted_at')
    .order('accepted_at');
  if (error) throw new PrivacyError(error.message, error.code);
  return (data ?? []).map((row) => ({
    type: row.type,
    version: row.version,
    acceptedAt: row.accepted_at,
  }));
}

/** Dados completos da própria pessoa, montados no servidor. */
export async function exportMyData(): Promise<ExportedData> {
  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw new PrivacyError(error.message, error.code);
  return data as unknown as ExportedData;
}

/**
 * Exclui a conta de forma definitiva. Antes pede a senha de novo: uma sessão esquecida aberta
 * não basta para apagar tudo. Depois encerra a sessão deste aparelho.
 */
export async function deleteMyAccount(email: string, password: string): Promise<void> {
  const check = await supabase.auth.signInWithPassword({ email, password });
  if (check.error) throw new PrivacyError('wrong_password', check.error.code);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new PrivacyError(error.message, error.code);
  // A conta já não existe: limpa só a sessão local (não há o que revogar no servidor).
  await supabase.auth.signOut({ scope: 'local' });
}

export function friendlyPrivacyError(error: unknown): string {
  const text = error instanceof Error ? error.message : '';
  if (text.includes('wrong_password')) return 'Senha incorreta. Confira e tente de novo.';
  if (text.toLowerCase().includes('fetch') || text.toLowerCase().includes('network')) {
    return 'Sem conexão no momento. Verifique sua internet.';
  }
  return 'Algo deu errado. Tente novamente em instantes.';
}
