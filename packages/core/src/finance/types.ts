import type { Cents } from '../money/money';

export type TransactionKind =
  | 'income'
  | 'expense'
  | 'investment' // aporte
  | 'redemption' // resgate
  | 'profit'
  | 'loss'
  | 'transfer';

/** Data civil no formato YYYY-MM-DD (sem fuso). */
export type DateString = string;

export interface Transaction {
  id?: string;
  kind: TransactionKind;
  /** Sempre positivo; o sinal é derivado de `kind`. */
  amountCents: Cents;
  occurredOn: DateString;
  accountId?: string;
  /** Apenas para `transfer`. */
  toAccountId?: string;
  categoryId?: string;
}

/** Intervalo inclusivo. */
export interface Period {
  from: DateString;
  to: DateString;
}
