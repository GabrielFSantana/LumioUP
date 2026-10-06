import { WCAG_AA, contrastRatio } from '@lumioup/core';
import { darkPalette, lightPalette, type Palette } from './colors';

/**
 * Acessibilidade (WCAG AA): toda cor usada como TEXTO precisa de contraste suficiente sobre os
 * fundos em que aparece. Vale para o modo claro e o escuro e cobre qualquer cor nova do tema.
 */
const PALETTES: [string, Palette][] = [
  ['claro', lightPalette],
  ['escuro', darkPalette],
];

/** Textos do app (propriedade `tone`) e os fundos sobre os quais podem aparecer. */
const TEXT_ON: [keyof Palette, (keyof Palette)[]][] = [
  ['text', ['background', 'surface', 'primarySoft']],
  ['textMuted', ['background', 'surface', 'primarySoft']],
  ['danger', ['background', 'surface']],
  ['incomeInk', ['background', 'surface', 'incomeSoft', 'primarySoft']],
  ['expenseInk', ['background', 'surface', 'expenseSoft', 'primarySoft']],
  ['investmentInk', ['background', 'surface', 'primarySoft']],
  ['goalInk', ['background', 'surface', 'primarySoft']],
  ['streakInk', ['background', 'surface', 'primarySoft']],
  ['onPrimary', ['primary']],
  ['heroText', ['heroBackground']],
  ['heroAccent', ['heroBackground']],
];

describe.each(PALETTES)('contraste de texto no modo %s', (_name, palette) => {
  for (const [fg, backgrounds] of TEXT_ON) {
    for (const bg of backgrounds) {
      it(`${fg} sobre ${bg} tem pelo menos ${WCAG_AA.text}:1`, () => {
        const ratio = contrastRatio(palette[fg], palette[bg]);
        expect(`${fg}/${bg}=${ratio.toFixed(2)}`).toBe(
          `${fg}/${bg}=${ratio >= WCAG_AA.text ? ratio.toFixed(2) : 'ok'}`,
        );
      });
    }
  }
});

/**
 * Cores de marca usadas só em preenchimentos e ícones (barras, selos): componentes gráficos pedem
 * 3:1 contra o cartão (surface). Quando uma delas vira texto, o app usa a versão "Ink".
 * `primaryEdge` (relevo e base dos botões) fica de fora: é decorativo, e o botão é identificado
 * pelo texto. Ver pendências em docs/publicacao.md.
 */
const GRAPHICS: (keyof Palette)[] = ['income', 'expense', 'investment', 'goal', 'streak'];

describe.each(PALETTES)('contraste de elementos gráficos no modo %s', (_name, palette) => {
  for (const fg of GRAPHICS) {
    it(`${fg} sobre surface tem pelo menos ${WCAG_AA.large}:1`, () => {
      expect(contrastRatio(palette[fg], palette.surface)).toBeGreaterThanOrEqual(
        WCAG_AA.large - 0.01,
      );
    });
  }
});
