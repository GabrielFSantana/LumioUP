import type { DateString, Transaction, TransactionKind } from './types';

export const INVESTMENT_KINDS = ['investment', 'redemption', 'profit', 'loss'] as const;

/** Aporte, resgate, lucro ou perda: movimentos ligados a uma posição de investimento. */
export function isInvestmentKind(kind: TransactionKind): boolean {
  return (INVESTMENT_KINDS as readonly string[]).includes(kind);
}

export function isValidDate(value: DateString): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Retorna a lista de problemas; vazia significa válido. */
export function validateTransaction(t: Transaction): string[] {
  const errors: string[] = [];
  if (!Number.isSafeInteger(t.amountCents) || t.amountCents <= 0) {
    errors.push('O valor deve ser um inteiro positivo em centavos.');
  }
  if (!isValidDate(t.occurredOn)) errors.push('Data inválida.');
  const investing = isInvestmentKind(t.kind);
  if (investing && !t.holdingId) errors.push('Escolha a posição de investimento.');
  if (!investing && t.holdingId) errors.push('Posição só vale em movimentos de investimento.');
  if (t.kind === 'transfer') {
    if (!t.accountId || !t.toAccountId) {
      errors.push('Transferência exige conta de origem e destino.');
    } else if (t.accountId === t.toAccountId) {
      errors.push('Origem e destino devem ser diferentes.');
    }
    if (t.categoryId) errors.push('Transferência não tem categoria.');
  } else if (t.toAccountId) {
    errors.push('Conta de destino só é válida em transferências.');
  }
  return errors;
}
