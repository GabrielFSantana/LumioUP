import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type Palette } from './colors';

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
/** Tamanho mínimo de toque recomendado (acessibilidade). */
export const minTouch = 48;
/** Espessura da "base" sólida dos botões e cartões (relevo sem sombra difusa). */
export const edge = 5;

/** Nomes registrados em useFonts (ver app/_layout.tsx). */
export const fonts = {
  display: 'Fredoka_600SemiBold',
  displayBold: 'Fredoka_700Bold',
  body: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
} as const;

export type { Palette };

export function useTheme(): { colors: Palette; isDark: boolean } {
  const isDark = useColorScheme() === 'dark';
  return { colors: isDark ? darkPalette : lightPalette, isDark };
}
