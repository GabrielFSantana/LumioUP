import type { CategoryColor } from '@lumioup/core';
import { useTheme } from './index';

/** Cores de categoria (chave salva no banco -> hex por tema). */
const palette: Record<CategoryColor, { light: string; dark: string }> = {
  coral: { light: '#E5533B', dark: '#FF7A62' },
  green: { light: '#17A865', dark: '#3DD68F' },
  blue: { light: '#2D7DF6', dark: '#6AAEFF' },
  teal: { light: '#0E9E99', dark: '#3FD4CE' },
  amber: { light: '#C28A00', dark: '#FFC400' },
  pink: { light: '#D4417E', dark: '#FF7FB0' },
  slate: { light: '#5F6B8A', dark: '#9AA5C4' },
  sand: { light: '#9A7F3F', dark: '#CDB57A' },
};

export function useCategoryColor(key: string): string {
  const { isDark } = useTheme();
  const entry = palette[key as CategoryColor] ?? palette.slate;
  return isDark ? entry.dark : entry.light;
}
