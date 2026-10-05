import { assertCents, formatBRL, formatCompactBRL, parseBRL, percentOf, sumCents } from './money';

describe('parseBRL', () => {
  it.each([
    ['10', 1000],
    ['10,5', 1050],
    ['10,50', 1050],
    ['1.234,56', 123456],
    ['R$ 1.234,56', 123456],
    ['0,01', 1],
    ['-5,5', -550],
    ['0', 0],
  ])('converte %s', (input, expected) => {
    expect(parseBRL(input)).toBe(expected);
  });

  it.each(['', 'abc', '1,234', '1.2,50', '10,', ',50', '1,2,3'])('rejeita "%s"', (input) => {
    expect(() => parseBRL(input)).toThrow();
  });
});

describe('formatBRL', () => {
  it.each([
    [0, 'R$ 0,00'],
    [1, 'R$ 0,01'],
    [123456, 'R$ 1.234,56'],
    [100000000, 'R$ 1.000.000,00'],
    [-550, '-R$ 5,50'],
  ])('formata %i', (cents, expected) => {
    expect(formatBRL(cents)).toBe(expected);
  });

  it('ida e volta preserva o valor', () => {
    for (const c of [0, 1, 99, 100, 123456, -98765]) {
      expect(parseBRL(formatBRL(c))).toBe(c);
    }
  });
});

describe('sumCents', () => {
  it('soma sem erro de ponto flutuante (0,10 + 0,20)', () => {
    expect(sumCents([10, 20])).toBe(30);
  });
  it('lista vazia = 0', () => expect(sumCents([])).toBe(0));
  it('rejeita não inteiros', () => expect(() => sumCents([1.5])).toThrow(RangeError));
});

describe('percentOf', () => {
  it('calcula com 1 casa', () => expect(percentOf(1, 3)).toBe(33.3));
  it('denominador zero retorna 0', () => expect(percentOf(100, 0)).toBe(0));
});

describe('assertCents', () => {
  it('rejeita NaN e Infinity', () => {
    expect(() => assertCents(NaN)).toThrow();
    expect(() => assertCents(Infinity)).toThrow();
  });
});

describe('formatCompactBRL', () => {
  it.each([
    [0, 'R$ 0'],
    [85000, 'R$ 850'],
    [99900, 'R$ 999'],
    [100000, 'R$ 1 mil'],
    [125000, 'R$ 1,3 mil'],
    [500000, 'R$ 5 mil'],
    [12345600, 'R$ 123,5 mil'],
    [100000000, 'R$ 1 mi'],
    [250000000, 'R$ 2,5 mi'],
    [-500000, '-R$ 5 mil'],
  ])('%i', (cents, expected) => {
    expect(formatCompactBRL(cents)).toBe(expected);
  });
});
