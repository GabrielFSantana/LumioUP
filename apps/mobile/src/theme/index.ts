import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type Palette } from './colors';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20 } as const;
/** Tamanho mínimo de toque recomendado (acessibilidade). */
export const minTouch = 48;

export type { Palette };

export function useTheme(): { colors: Palette; isDark: boolean } {
  const isDark = useColorScheme() === 'dark';
  return { colors: isDark ? darkPalette : lightPalette, isDark };
}
