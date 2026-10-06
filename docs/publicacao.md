# Qualidade e publicação (Etapa 17)

Este documento resume o que foi verificado, como repetir as verificações, o passo a passo para publicar e,
principalmente, **o que ainda não foi testado** ou **depende de você**.

## 1. O que foi verificado

| Área | Resultado | Como repetir |
|---|---|---|
| Lint e tipos (todo o repositório) | sem erros | `npm run lint` · `npm run typecheck` |
| Testes unitários (core e tema do app) | 382 passando | `npm test` |
| Banco: RLS, permissões e regras | 423 asserções passando | `npm run db:test` (Docker aberto) |
| Segurança transversal do banco | toda tabela com RLS; todo `SECURITY DEFINER` com `search_path`; nenhuma função executável pelo acesso anônimo; lista fixa de tabelas com escrita direta; ninguém tem `DELETE` | `supabase/tests/database/security.test.sql` |
| Jornada completa contra o Supabase local | 10 passos (cadastro → lançamentos → XP → meta → estudo → clube → desafio → ranking → exportar → excluir conta), com dois usuários reais | `npm run test:integration` |
| Desempenho | 5 mil lançamentos: dados completos em ~370 ms (8 chamadas de 7 a 51 ms); cálculos do dashboard com 20 mil lançamentos levam 1 a 9 ms (limite do teste: 2 s) | `packages/core/src/finance/performance.test.ts` |
| Acessibilidade: contraste | texto em AA (4,5:1) nos modos claro e escuro, para cada cor usada como texto; elementos gráficos em 3:1 | `apps/mobile/src/theme/contrast.test.ts` |
| Acessibilidade: rótulos | os 22 botões tocáveis têm papel ou rótulo para leitor de tela | varredura estática feita nesta etapa |
| Configuração Expo | `expo-doctor` 21/21 | `cd apps/mobile && npx expo-doctor` |
| Build nativo (compilação) | bundles Hermes de Android (4,7 MB) e iOS (4,4 MB) gerados sem erro | `cd apps/mobile && npx expo export --platform android --platform ios` |
| CI | lint, tipos, testes unitários, pgTAP e jornada em dois jobs | `.github/workflows/ci.yml` |

### Correções feitas por causa da auditoria

- 12 funções de gatilho estavam executáveis pelo acesso anônimo (não davam para chamar como API, mas é higiene):
  migração `20261010000000_harden_functions.sql` fechou todas e fez funções futuras nascerem fechadas.
- 5 cores de marca usadas como texto ficavam com 2,8 a 3,9:1 no tema claro: foram criadas as versões `investmentInk`,
  `goalInk` e `streakInk` (e os usos trocados); as cores de marca seguem para preenchimentos e ícones.
- Ícones e tela de abertura eram os **modelos padrão do Expo**: agora vêm do mascote Lumi (`tools/generate-app-icons.mjs`).
- 3 pacotes Expo estavam com versão de correção defasada; atualizados.

## 2. Dependências vulneráveis (`npm audit`)

O `npm audit` aponta 30 itens, **todos em ferramentas de build** (Metro, CLI do Expo, plugins de configuração,
`node-forge` na assinatura de código, `micromatch`/`braces`). Não vão no aplicativo que o usuário instala.
A "correção" sugerida (`npm audit fix --force`) rebaixaria o Expo para a versão 44 e **quebraria o projeto**: não use.
O caminho certo é acompanhar as atualizações do SDK do Expo.

## 3. Passo a passo para publicar (depende de você)

**Antes de tudo, decida o identificador do app.** Deixei `com.lumioup.app` (iOS e Android) como provisório em
`apps/mobile/app.json`. **Depois do primeiro envio às lojas ele não muda mais.** Troque agora se quiser outro.

1. **Contas:** Apple Developer (para iOS/TestFlight) e Google Play Console (Android). Conta Expo gratuita para o EAS.
2. **Projeto Supabase de produção:** crie um projeto novo (nunca use o local), aplique as migrações com
   `npx supabase link` e `npx supabase db push`. No painel de Auth: ligar confirmação de e-mail, configurar SMTP
   próprio, URLs de redirecionamento e limites de taxa. A chave `service_role` **nunca** entra no app.
3. **EAS:** `npx eas-cli login`, depois `npx eas-cli init` dentro de `apps/mobile` (grava o `projectId`).
4. **Variáveis de ambiente do build** (a chave `anon` é pública por desenho; a segurança está nas regras do banco):

   ```bash
   npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://SEU-PROJETO.supabase.co
   npx eas-cli env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value SUA_CHAVE_ANON
   # repetir para --environment production
   ```

5. **Beta fechado (Android):** `npx eas-cli build --profile preview --platform android` gera um APK interno para
   instalar em aparelhos de teste. Para a loja: `--profile production` gera o `.aab` e `eas submit` envia à trilha
   de teste fechado no Play Console.
6. **iOS:** `npx eas-cli build --profile production --platform ios` e envio ao TestFlight.
7. **Material das lojas:** política de privacidade em **URL pública**; formulário de segurança de dados
   (use `docs/privacidade-lgpd.md`); categoria Finanças com aviso de que o app é educativo e **não é instituição
   financeira nem recomenda investimentos**; capturas de tela; classificação etária.
8. **Exclusão de conta:** já existe dentro do app (Perfil → Privacidade e dados). O Google Play também pede
   **um endereço na web** que explique como pedir a exclusão; prepare uma página simples com esse passo a passo.

## 4. O que NÃO foi testado (e precisa ser, antes de lançar)

- **Nenhum teste em aparelho ou emulador.** Tudo foi verificado no navegador, no banco e em compilação. Falta validar:
  - **Notificações reais:** permissão do sistema, disparo no horário, toque abrindo a tela certa (a lógica de
    quando agendar está testada; o disparo não).
  - **Exportação:** o menu de compartilhar arquivos no Android e no iOS.
  - **Leitores de tela** (TalkBack e VoiceOver), **fonte aumentada do sistema** e telas pequenas (~360 px) em aparelho real.
  - **Biometria:** o bloqueio por biometria não foi implementado (`user_settings.biometric_lock` existe, sem uso).
- **E2E em aparelho (Maestro):** não escrevi fluxos porque não consigo executá-los aqui; um fluxo que eu não rodei
  não é um teste. A jornada de integração cobre o mesmo caminho pela API.
- **Contraste, pendências conhecidas:** `primaryEdge` (relevo dos botões e trilho "ligado" dos interruptores) fica em
  ~2,5:1 no tema claro. Os botões têm texto de alto contraste, mas o trilho do interruptor deveria ficar mais escuro.
- **Revisão jurídica** dos termos e da política de privacidade, contato do encarregado de dados (LGPD) e prazo de
  retenção dos backups do provedor.
- **Push remoto** (atividades do clube e conquistas de outras pessoas): decisão registrada em
  `docs/decisions/0002-notificacoes-locais.md`.
- **Carga:** o desempenho foi medido com 5 mil lançamentos de um usuário e dados sintéticos. Com 20 mil, o app faz
  cerca de 20 chamadas paginadas para carregar o histórico; vale reavaliar a agregação no servidor se isso virar uso comum.
