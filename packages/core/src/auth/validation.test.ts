import { validateDisplayName, validateEmail, validatePassword } from './validation';

describe('validateEmail', () => {
  it.each(['a@b.co', ' pessoa@exemplo.com.br ', 'nome+tag@dominio.org'])('aceita %s', (v) => {
    expect(validateEmail(v)).toBeNull();
  });
  it.each(['', '   ', 'sem-arroba', 'a@b', 'a@@b.com', 'a b@c.com', `${'x'.repeat(250)}@a.com`])(
    'rejeita "%s"',
    (v) => {
      expect(validateEmail(v)).not.toBeNull();
    },
  );
});

describe('validatePassword', () => {
  it('aceita senha com letras, números e 8+ caracteres', () => {
    expect(validatePassword('abc12345')).toBeNull();
  });
  it('rejeita curta', () => expect(validatePassword('abc123')).not.toBeNull());
  it('rejeita só letras ou só números', () => {
    expect(validatePassword('abcdefgh')).not.toBeNull();
    expect(validatePassword('12345678')).not.toBeNull();
  });
});

describe('validateDisplayName', () => {
  it('aceita nome normal', () => expect(validateDisplayName('Ana')).toBeNull());
  it('rejeita vazio ou só espaços', () => {
    expect(validateDisplayName('')).not.toBeNull();
    expect(validateDisplayName('   ')).not.toBeNull();
  });
  it('rejeita acima de 60 caracteres', () => {
    expect(validateDisplayName('a'.repeat(61))).not.toBeNull();
    expect(validateDisplayName('a'.repeat(60))).toBeNull();
  });
});
