import { WCAG_AA, contrastRatio, relativeLuminance } from './contrast';

describe('contraste WCAG', () => {
  it('preto no branco é 21 e cor igual é 1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('não depende da ordem das cores', () => {
    expect(contrastRatio('#14213D', '#FFF8E7')).toBeCloseTo(
      contrastRatio('#FFF8E7', '#14213D'),
      10,
    );
  });

  it('bate com valores de referência conhecidos', () => {
    // Cinza #767676 sobre branco é o limite clássico de 4,5:1.
    expect(contrastRatio('#767676', '#FFFFFF')).toBeGreaterThan(4.5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeLessThan(4.6);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('recusa cores inválidas', () => {
    expect(() => relativeLuminance('azul')).toThrow();
    expect(() => relativeLuminance('#FFF')).toThrow();
  });

  it('expõe os mínimos AA', () => {
    expect(WCAG_AA).toEqual({ text: 4.5, large: 3 });
  });
});
