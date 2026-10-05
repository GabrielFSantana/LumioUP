import { supabase } from '../../lib/supabase';

export interface Holding {
  id: string;
  name: string;
  categoryId: string;
  isArchived: boolean;
}

/** Erro do banco com mensagem e código preservados, para tradução amigável. */
export class HoldingError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function fail(error: { message: string; code?: string }): never {
  throw new HoldingError(error.message, error.code);
}

export async function fetchHoldings(): Promise<Holding[]> {
  const { data, error } = await supabase
    .from('holdings')
    .select('id, name, category_id, is_archived')
    .order('name');
  if (error) fail(error);
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    isArchived: row.is_archived,
  }));
}

export async function createHolding(
  profileId: string,
  input: { name: string; categoryId: string },
): Promise<void> {
  const { error } = await supabase
    .from('holdings')
    .insert({ profile_id: profileId, name: input.name.trim(), category_id: input.categoryId });
  if (error) fail(error);
}

/** A categoria da posição não muda depois de criada. */
export async function updateHolding(
  id: string,
  changes: { name?: string; isArchived?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('holdings')
    .update({
      ...(changes.name !== undefined && { name: changes.name.trim() }),
      ...(changes.isArchived !== undefined && { is_archived: changes.isArchived }),
    })
    .eq('id', id);
  if (error) fail(error);
}

export function friendlyHoldingError(error: unknown): string {
  const code = error instanceof HoldingError ? error.code : undefined;
  const text = error instanceof Error ? error.message : '';
  if (code === '23505') return 'Já existe uma posição com esse nome. Tente outro.';
  if (text.includes('holding_limit_reached')) return 'Você chegou ao limite de posições.';
  if (text.includes('category_archived')) return 'Essa categoria está arquivada. Escolha outra.';
  if (text.toLowerCase().includes('fetch') || text.toLowerCase().includes('network')) {
    return 'Sem conexão no momento. Verifique sua internet.';
  }
  return 'Algo deu errado. Tente novamente em instantes.';
}
