/** Contraste de cores segundo a WCAG 2.x (usado para garantir AA nas cores do tema). */

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa de uma cor "#RRGGBB". */
export function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`Cor inválida: ${hex}`);
  const n = parseInt(match[1] as string, 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}

/** Razão de contraste entre duas cores, de 1 (iguais) a 21 (preto no branco). */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
}

/** Mínimos da WCAG AA: 4,5 para texto normal, 3 para texto grande/negrito e componentes de interface. */
export const WCAG_AA = { text: 4.5, large: 3 } as const;
