/**
 * Identidade visual LumioUP (proposta aprovada em docs/identidade-visual/mockup.html).
 * Cores têm significado fixo: amarelo = ação e progresso; verde = receita;
 * coral = gasto; azul = investimento; verde-azulado = meta.
 */
export interface Palette {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  /** Ação principal e progresso (Luz). */
  primary: string;
  /** "Base" sólida do botão e relevo. */
  primaryEdge: string;
  primarySoft: string;
  onPrimary: string;
  income: string;
  incomeSoft: string;
  incomeInk: string;
  expense: string;
  expenseSoft: string;
  expenseInk: string;
  investment: string;
  /** Versão para TEXTO (contraste AA); `investment` fica para preenchimentos e ícones. */
  investmentInk: string;
  investmentSoft: string;
  goal: string;
  goalInk: string;
  goalSoft: string;
  streak: string;
  streakInk: string;
  danger: string;
  /** Cartão de destaque (saldo). */
  heroBackground: string;
  heroText: string;
  heroAccent: string;
}

export const lightPalette: Palette = {
  background: '#FFF8E7',
  surface: '#FFFFFF',
  border: '#EADFC2',
  text: '#14213D',
  textMuted: '#55607F',
  primary: '#FFC400',
  primaryEdge: '#D49A00',
  primarySoft: '#FFF1B8',
  onPrimary: '#14213D',
  income: '#17A865',
  incomeSoft: '#D7F5E6',
  incomeInk: '#0B6B40',
  expense: '#E5533B',
  expenseSoft: '#FFE0DA',
  expenseInk: '#9A2E1B',
  investment: '#2D7DF6',
  investmentInk: '#1B5FCC',
  investmentSoft: '#DCE9FF',
  goal: '#0E9E99',
  goalInk: '#0A726D',
  goalSoft: '#D2F3F1',
  streak: '#E07B00',
  streakInk: '#9A5200',
  danger: '#B42318',
  heroBackground: '#14213D',
  heroText: '#FFF8E7',
  heroAccent: '#FFC400',
};

export const darkPalette: Palette = {
  background: '#0E1424',
  surface: '#18203A',
  border: '#2A3558',
  text: '#F5F1E3',
  textMuted: '#A9B2CF',
  primary: '#FFC400',
  primaryEdge: '#D49A00',
  primarySoft: '#3A3210',
  onPrimary: '#14213D',
  income: '#3DD68F',
  incomeSoft: '#123A2C',
  incomeInk: '#7BF0B8',
  expense: '#FF7A62',
  expenseSoft: '#3F1F1B',
  expenseInk: '#FFB3A5',
  investment: '#6AAEFF',
  investmentInk: '#6AAEFF',
  investmentSoft: '#17294A',
  goal: '#3FD4CE',
  goalInk: '#3FD4CE',
  goalSoft: '#10373A',
  streak: '#FF9F1C',
  streakInk: '#FF9F1C',
  danger: '#FF8A80',
  heroBackground: '#FFC400',
  heroText: '#14213D',
  heroAccent: '#14213D',
};
