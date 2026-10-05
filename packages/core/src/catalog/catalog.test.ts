import {
  CATEGORY_COLORS,
  MAX_OPENING_BALANCE_CENTS,
  isSameCatalogName,
  validateCatalogName,
  validateOpeningBalance,
} from './catalog';

describe('validateCatalogName', () => {
  it('aceita nome normal e com acento', () => {
    expect(validateCatalogName('Alimentação')).toBeNull();
  });
  it('rejeita vazio ou só espaços', () => {
    expect(validateCatalogName('')).not.toBeNull();
    expect(validateCatalogName('   ')).not.toBeNull();
  });
  it('limite de 40 caracteres, ignorando espaços nas pontas', () => {
    expect(validateCatalogName('a'.repeat(40))).toBeNull();
    expect(validateCatalogName(` ${'a'.repeat(40)} `)).toBeNull();
    expect(validateCatalogName('a'.repeat(41))).not.toBeNull();
  });
});

describe('validateOpeningBalance', () => {
  it('aceita zero e o máximo', () => {
    expect(validateOpeningBalance(0)).toBeNull();
    expect(validateOpeningBalance(MAX_OPENING_BALANCE_CENTS)).toBeNull();
  });
  it.each([-1, 1.5, NaN, Infinity, MAX_OPENING_BALANCE_CENTS + 1])('rejeita %p', (v) => {
    expect(validateOpeningBalance(v)).not.toBeNull();
  });
});

describe('isSameCatalogName', () => {
  it('ignora caixa e espaços das pontas, como o índice único do banco', () => {
    expect(isSameCatalogName('Moradia', '  moradia ')).toBe(true);
    expect(isSameCatalogName('Moradia', 'Mora dia')).toBe(false);
  });
});

describe('CATEGORY_COLORS', () => {
  it('tem as 8 cores aceitas pelo banco, sem repetição', () => {
    expect(new Set(CATEGORY_COLORS).size).toBe(8);
  });
});
