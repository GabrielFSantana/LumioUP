import type { Cents } from '../money/money';

export type CategoryKind = 'expense' | 'income' | 'investment';
export type AccountKind = 'wallet' | 'checking' | 'savings' | 'investment' | 'other';

/** Chaves de cor aceitas pelo banco (check constraint) e mapeadas para hex no tema do app. */
export const CATEGORY_COLORS = [
  'coral',
  'green',
  'blue',
  'teal',
  'amber',
  'pink',
  'slate',
  'sand',
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = {
  expense: 'Gastos',
  income: 'Receitas',
  investment: 'Investimentos',
};

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  wallet: 'Carteira',
  checking: 'Conta corrente',
  savings: 'Poupança',
  investment: 'Investimentos',
  other: 'Outra',
};

export const MAX_CATALOG_NAME_LENGTH = 40;
/** Mesmo limite do banco: 11 dígitos em centavos (R$ 999.999.999,99). */
export const MAX_OPENING_BALANCE_CENTS: Cents = 99_999_999_999;

/** Nome de categoria ou conta. Retorna mensagem de erro (pt-BR) ou null se válido. */
export function validateCatalogName(name: string): string | null {
  const value = name.trim();
  if (value === '') return 'Dê um nome.';
  if (value.length > MAX_CATALOG_NAME_LENGTH) {
    return `Use até ${MAX_CATALOG_NAME_LENGTH} caracteres.`;
  }
  return null;
}

/** Saldo inicial da conta: inteiro em centavos, de zero ao máximo. */
export function validateOpeningBalance(cents: Cents): string | null {
  if (!Number.isSafeInteger(cents) || cents < 0) return 'Informe um valor a partir de R$ 0,00.';
  if (cents > MAX_OPENING_BALANCE_CENTS) return 'Esse valor é alto demais.';
  return null;
}

/** Compara nomes como o banco: ignora maiúsculas/minúsculas e espaços nas pontas. */
export function isSameCatalogName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
