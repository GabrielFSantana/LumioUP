export interface Palette {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  onPrimary: string;
  /** Cores semânticas: sempre as mesmas para o mesmo significado. */
  income: string;
  expense: string;
  investment: string;
  goal: string;
  danger: string;
}

export const lightPalette: Palette = {
  background: '#F6F7FB',
  surface: '#FFFFFF',
  border: '#E3E6EF',
  text: '#1B1F2A',
  textMuted: '#5B6275',
  primary: '#5B3FD9',
  onPrimary: '#FFFFFF',
  income: '#12805C',
  expense: '#C2410C',
  investment: '#1D6FD8',
  goal: '#B7791F',
  danger: '#B42318',
};

export const darkPalette: Palette = {
  background: '#0F1220',
  surface: '#191D2E',
  border: '#2A3047',
  text: '#F2F4FA',
  textMuted: '#A3ABC2',
  primary: '#8F7CFF',
  onPrimary: '#10131F',
  income: '#3DD6A0',
  expense: '#FF9A62',
  investment: '#6AAEFF',
  goal: '#F5C451',
  danger: '#FF8A80',
};
