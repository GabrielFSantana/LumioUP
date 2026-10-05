import type { AccountKind, CategoryColor, CategoryKind } from '@lumioup/core';
import { supabase } from '../../lib/supabase';

export interface Category {
  id: string;
  kind: CategoryKind;
  name: string;
  icon: string;
  color: CategoryColor;
  isArchived: boolean;
  sortOrder: number;
}

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  openingBalanceCents: number;
  isArchived: boolean;
}

/** Erro do banco com o código preservado, para mensagens amigáveis. */
export class CatalogError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function fail(error: { message: string; code?: string }): never {
  throw new CatalogError(error.message, error.code);
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, kind, name, icon, color, is_archived, sort_order')
    .order('kind')
    .order('sort_order')
    .order('name');
  if (error) fail(error);
  return data.map((row) => ({
    id: row.id,
    kind: row.kind as CategoryKind,
    name: row.name,
    icon: row.icon,
    color: row.color as CategoryColor,
    isArchived: row.is_archived,
    sortOrder: row.sort_order,
  }));
}

export interface CategoryInput {
  kind: CategoryKind;
  name: string;
  icon: string;
  color: CategoryColor;
}

/** Categorias criadas pelo usuário ficam depois das padrão (ordem 1..11). */
const CUSTOM_SORT_ORDER = 100;

export async function createCategory(profileId: string, input: CategoryInput): Promise<void> {
  const { error } = await supabase.from('categories').insert({
    profile_id: profileId,
    kind: input.kind,
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    sort_order: CUSTOM_SORT_ORDER,
  });
  if (error) fail(error);
}

export async function updateCategory(
  id: string,
  changes: Partial<Pick<CategoryInput, 'name' | 'icon' | 'color'>> & { isArchived?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .update({
      ...(changes.name !== undefined && { name: changes.name.trim() }),
      ...(changes.icon !== undefined && { icon: changes.icon }),
      ...(changes.color !== undefined && { color: changes.color }),
      ...(changes.isArchived !== undefined && { is_archived: changes.isArchived }),
    })
    .eq('id', id);
  if (error) fail(error);
}

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, kind, opening_balance_cents, is_archived')
    .order('created_at');
  if (error) fail(error);
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind as AccountKind,
    openingBalanceCents: row.opening_balance_cents,
    isArchived: row.is_archived,
  }));
}

export interface AccountInput {
  name: string;
  kind: AccountKind;
  openingBalanceCents: number;
}

export async function createAccount(profileId: string, input: AccountInput): Promise<void> {
  const { error } = await supabase.from('accounts').insert({
    profile_id: profileId,
    name: input.name.trim(),
    kind: input.kind,
    opening_balance_cents: input.openingBalanceCents,
  });
  if (error) fail(error);
}

export async function updateAccount(
  id: string,
  changes: Partial<AccountInput> & { isArchived?: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('accounts')
    .update({
      ...(changes.name !== undefined && { name: changes.name.trim() }),
      ...(changes.kind !== undefined && { kind: changes.kind }),
      ...(changes.openingBalanceCents !== undefined && {
        opening_balance_cents: changes.openingBalanceCents,
      }),
      ...(changes.isArchived !== undefined && { is_archived: changes.isArchived }),
    })
    .eq('id', id);
  if (error) fail(error);
}

/** Mensagem simples e sem culpa para erros do catálogo. */
export function friendlyCatalogError(error: unknown): string {
  const code = error instanceof CatalogError ? error.code : undefined;
  const text = error instanceof Error ? error.message : '';
  if (code === '23505') return 'Já existe um item com esse nome. Tente outro.';
  if (text.includes('category_limit_reached')) return 'Você chegou ao limite de categorias.';
  if (text.includes('account_limit_reached')) return 'Você chegou ao limite de contas.';
  if (text.toLowerCase().includes('fetch') || text.toLowerCase().includes('network')) {
    return 'Sem conexão no momento. Verifique sua internet.';
  }
  return 'Algo deu errado. Tente novamente em instantes.';
}
