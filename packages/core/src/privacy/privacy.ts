/** Tipos de consentimento registrados no cadastro (tabela `consents`). */
export const CONSENT_LABELS: Record<string, string> = {
  terms: 'Termos de uso',
  privacy: 'Política de privacidade',
  ranking_amounts: 'Compartilhar valores no ranking',
};

export function consentLabel(type: string): string {
  return CONSENT_LABELS[type] ?? type;
}

const KIND_LABELS: Record<string, string> = {
  income: 'Receita',
  expense: 'Gasto',
  investment: 'Aporte',
  redemption: 'Resgate',
  profit: 'Lucro',
  loss: 'Perda',
  transfer: 'Transferência',
};

/**
 * Protege contra "injeção de fórmula": planilhas executam células que começam com = + - @ (e tab/CR).
 * Textos digitados pelo usuário (descrição, nomes) ganham um apóstrofo na frente.
 */
export function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

/** Célula CSV (RFC 4180): aspas quando há vírgula, aspas, quebra de linha ou ponto e vírgula. */
export function csvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",;\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Marca de ordem de bytes: faz o Excel abrir o arquivo como UTF-8. */
export const CSV_BOM = String.fromCharCode(0xfeff);

/** Linhas de texto em CSV, com BOM para o Excel abrir os acentos corretamente. */
export function toCsv(
  header: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(','));
  return `${CSV_BOM}${lines.join('\r\n')}\r\n`;
}

/** 123456 -> "1234.56" (ponto decimal, sem separador de milhar, bom para planilhas e programas). */
export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(cents));
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

interface ExportedTransaction {
  occurred_on: string;
  kind: string;
  amount_cents: number;
  account_id?: string | null;
  to_account_id?: string | null;
  category_id?: string | null;
  description?: string | null;
  deleted_at?: string | null;
}

export interface ExportLike {
  transactions?: readonly ExportedTransaction[] | null;
  accounts?: readonly { id: string; name: string }[] | null;
  categories?: readonly { id: string; name: string }[] | null;
}

export const TRANSACTIONS_CSV_HEADER = [
  'data',
  'tipo',
  'valor',
  'conta',
  'conta_destino',
  'categoria',
  'descricao',
  'excluido',
] as const;

/** CSV dos lançamentos exportados (do mais antigo ao mais novo; excluídos marcados). */
export function transactionsToCsv(data: ExportLike): string {
  const accounts = new Map((data.accounts ?? []).map((a) => [a.id, a.name]));
  const categories = new Map((data.categories ?? []).map((c) => [c.id, c.name]));
  const text = (value: string | undefined | null) => neutralizeFormula(value ?? '');
  const rows = [...(data.transactions ?? [])]
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
    .map((t) => [
      t.occurred_on,
      KIND_LABELS[t.kind] ?? t.kind,
      centsToDecimalString(t.amount_cents),
      text(t.account_id ? accounts.get(t.account_id) : ''),
      text(t.to_account_id ? accounts.get(t.to_account_id) : ''),
      text(t.category_id ? categories.get(t.category_id) : ''),
      text(t.description),
      t.deleted_at ? 'sim' : 'nao',
    ]);
  return toCsv(TRANSACTIONS_CSV_HEADER, rows);
}

export type ExportFormat = 'json' | 'csv';

/** Ex.: lumioup-dados-2026-10-09.json / lumioup-lancamentos-2026-10-09.csv */
export function exportFileName(format: ExportFormat, date: string): string {
  return format === 'json' ? `lumioup-dados-${date}.json` : `lumioup-lancamentos-${date}.csv`;
}

export const EXPORT_MIME: Record<ExportFormat, string> = {
  json: 'application/json',
  csv: 'text/csv',
};
