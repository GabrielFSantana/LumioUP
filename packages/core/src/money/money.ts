/** Dinheiro é sempre representado em centavos inteiros (number seguro). */
export type Cents = number;

export function assertCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Valor em centavos deve ser inteiro seguro: ${value}`);
  }
  return value;
}

/**
 * Converte texto monetário pt-BR ("1.234,56", "R$ 10", "-5,5") em centavos.
 * Lança erro para entradas inválidas ou com mais de 2 casas decimais.
 */
export function parseBRL(input: string): Cents {
  const text = input.replace(/R\$|\s/g, '');
  const match = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error(`Valor monetário inválido: "${input}"`);
  const [, sign, intPart, decPart = ''] = match;
  const reais = Number((intPart as string).replace(/\./g, ''));
  const cents = Number(decPart.padEnd(2, '0'));
  const total = reais * 100 + cents;
  return assertCents(sign === '-' ? -total : total);
}

/** Formata centavos como "R$ 1.234,56" (sem depender de Intl no runtime). */
export function formatBRL(cents: Cents): string {
  assertCents(cents);
  const abs = Math.abs(cents);
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dec = (abs % 100).toString().padStart(2, '0');
  return `${cents < 0 ? '-' : ''}R$ ${reais},${dec}`;
}

export function sumCents(values: readonly Cents[]): Cents {
  return assertCents(values.reduce((acc, v) => acc + assertCents(v), 0));
}

/** Percentual com 1 casa decimal; retorna 0 se o denominador for 0. */
export function percentOf(part: Cents, whole: Cents): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}
