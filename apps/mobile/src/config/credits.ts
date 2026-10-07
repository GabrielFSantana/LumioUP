/**
 * Créditos exibidos em Perfil → Sobre o LumioUP. Para mudar o texto da tela, edite só este arquivo.
 */
export const CREDITS = {
  developer: {
    name: 'Gabriel',
    role: 'Ideia, produto e desenvolvimento',
    github: 'https://github.com/GabrielFSantana',
  },
  /** Código aberto: qualquer pessoa pode ler como o app foi feito. */
  repository: 'https://github.com/GabrielFSantana/LumioUP',
  /** Linha de transparência sobre o processo de criação. Apague se não quiser exibir. */
  assistedBy: 'Desenvolvido com apoio do Claude, assistente de IA da Anthropic.',
  tagline: 'Acenda a luz do seu controle financeiro.',
  /** Ferramentas e fontes usadas, com o devido reconhecimento. */
  builtWith: [
    { name: 'Expo e React Native', note: 'base do aplicativo' },
    { name: 'Supabase', note: 'banco de dados e autenticação' },
    { name: 'Fredoka e Nunito', note: 'fontes (licença SIL Open Font)' },
    { name: 'Ionicons', note: 'ícones' },
  ],
} as const;
