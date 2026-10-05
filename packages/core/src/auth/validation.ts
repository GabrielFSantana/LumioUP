export const MIN_PASSWORD_LENGTH = 8;
export const MAX_DISPLAY_NAME_LENGTH = 60;

/** Cada função retorna uma mensagem de erro (pt-BR, tom neutro) ou null se válido. */
export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (value === '') return 'Informe seu e-mail.';
  if (value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return 'Esse e-mail não parece válido.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Misture letras e números para deixar a senha mais segura.';
  }
  return null;
}

export function validateDisplayName(name: string): string | null {
  const value = name.trim();
  if (value === '') return 'Como podemos te chamar?';
  if (value.length > MAX_DISPLAY_NAME_LENGTH) {
    return `Use até ${MAX_DISPLAY_NAME_LENGTH} caracteres.`;
  }
  return null;
}
