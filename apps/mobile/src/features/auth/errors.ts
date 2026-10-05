/** Traduz erros do Supabase Auth para mensagens simples e sem culpar o usuário. */
export function friendlyAuthError(error: {
  message?: string;
  code?: string;
  status?: number;
}): string {
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  if (text.includes('invalid login credentials') || text.includes('invalid_credentials')) {
    return 'E-mail ou senha não conferem. Tente de novo.';
  }
  if (text.includes('already registered') || text.includes('user_already_exists')) {
    return 'Esse e-mail já tem cadastro. Que tal entrar?';
  }
  if (text.includes('email not confirmed') || text.includes('email_not_confirmed')) {
    return 'Confirme seu e-mail pelo link que enviamos e tente de novo.';
  }
  if (text.includes('weak_password') || text.includes('password should be')) {
    return 'Escolha uma senha mais forte (8+ caracteres, com letras e números).';
  }
  if (text.includes('rate limit') || error.status === 429) {
    return 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.';
  }
  if (text.includes('network') || text.includes('failed to fetch')) {
    return 'Sem conexão no momento. Verifique sua internet.';
  }
  return 'Algo deu errado. Tente novamente em instantes.';
}
