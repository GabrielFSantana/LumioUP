import type { Period, TransactionKind } from '@lumioup/core';
import { supabase } from '../../lib/supabase';

export interface TransactionItem {
  id: string;
  kind: TransactionKind;
  amountCents: number;
  occurredOn: string;
  /** Nulo apenas em lucro e perda, que não movem dinheiro das contas. */
  accountId: string | null;
  toAccountId: string | null;
  categoryId: string | null;
  holdingId: string | null;
  description: string | null;
}

export interface TransactionInput {
  kind: TransactionKind;
  amountCents: number;
  occurredOn: string;
  accountId?: string | null;
  toAccountId?: string | null;
  categoryId?: string | null;
  holdingId?: string | null;
  description?: string | null;
}

const COLUMNS =
  'id, kind, amount_cents, occurred_on, account_id, to_account_id, category_id, holding_id, description';

type Row = {
  id: string;
  kind: string;
  amount_cents: number;
  occurred_on: string;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  holding_id: string | null;
  description: string | null;
};

function toItem(row: Row): TransactionItem {
  return {
    id: row.id,
    kind: row.kind as TransactionKind,
    amountCents: row.amount_cents,
    occurredOn: row.occurred_on,
    accountId: row.account_id,
    toAccountId: row.to_account_id,
    categoryId: row.category_id,
    holdingId: row.holding_id,
    description: row.description,
  };
}

/** Erro do banco com mensagem e código preservados, para tradução amigável. */
export class TransactionError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function fail(error: { message: string; code?: string }): never {
  throw new TransactionError(error.message, error.code);
}

/** Limite de segurança por consulta; a lista de um mês fica bem abaixo disso. */
const MAX_ROWS = 2000;

export async function fetchTransactions(period: Period): Promise<TransactionItem[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(COLUMNS)
    .is('deleted_at', null)
    .gte('occurred_on', period.from)
    .lte('occurred_on', period.to)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);
  if (error) fail(error);
  return data.map(toItem);
}

/** Todos os movimentos de investimento (de qualquer data): base do valor atual das posições. */
export async function fetchInvestmentTransactions(): Promise<TransactionItem[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(COLUMNS)
    .is('deleted_at', null)
    .in('kind', ['investment', 'redemption', 'profit', 'loss'])
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS * 5);
  if (error) fail(error);
  return data.map(toItem);
}

export async function fetchTransaction(id: string): Promise<TransactionItem | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select(COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) fail(error);
  return data ? toItem(data) : null;
}

function toRow(input: TransactionInput) {
  const investing =
    input.kind === 'investment' ||
    input.kind === 'redemption' ||
    input.kind === 'profit' ||
    input.kind === 'loss';
  return {
    kind: input.kind,
    amount_cents: input.amountCents,
    occurred_on: input.occurredOn,
    // Lucro e perda não movem dinheiro das contas.
    account_id: input.kind === 'profit' || input.kind === 'loss' ? null : (input.accountId ?? null),
    to_account_id: input.kind === 'transfer' ? (input.toAccountId ?? null) : null,
    // Em movimentos de investimento a categoria vem da posição (definida pelo banco).
    category_id: input.kind === 'transfer' || investing ? null : (input.categoryId ?? null),
    holding_id: investing ? (input.holdingId ?? null) : null,
    description: input.description?.trim() ? input.description.trim() : null,
  };
}

export async function createTransaction(profileId: string, input: TransactionInput): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .insert({ profile_id: profileId, ...toRow(input) });
  if (error) fail(error);
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<void> {
  const { error } = await supabase.from('transactions').update(toRow(input)).eq('id', id);
  if (error) fail(error);
}

/** Exclusão lógica: permite "Desfazer". */
export async function setTransactionDeleted(id: string, deleted: boolean): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) fail(error);
}

/** Mensagem simples e sem culpa para erros de lançamentos. */
export function friendlyTransactionError(error: unknown): string {
  const text = error instanceof Error ? error.message : '';
  if (text.includes('category_archived')) return 'Essa categoria está arquivada. Escolha outra.';
  if (text.includes('account_archived')) return 'Essa conta está arquivada. Escolha outra.';
  if (text.includes('category_kind_mismatch')) return 'Essa categoria não serve para este tipo.';
  if (text.includes('holding_archived')) return 'Essa posição está arquivada. Escolha outra.';
  if (text.includes('holding_required') || text.includes('invalid_holding')) {
    return 'Escolha a posição de investimento.';
  }
  if (text.includes('invalid_date')) return 'Essa data está fora do período aceito.';
  if (text.includes('invalid_account') || text.includes('invalid_category')) {
    return 'Conta ou categoria não encontrada. Atualize a tela e tente de novo.';
  }
  if (text.toLowerCase().includes('fetch') || text.toLowerCase().includes('network')) {
    return 'Sem conexão no momento. Verifique sua internet.';
  }
  return 'Algo deu errado. Tente novamente em instantes.';
}
