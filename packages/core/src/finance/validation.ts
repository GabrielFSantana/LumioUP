import type { DateString, Transaction } from './types';

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
