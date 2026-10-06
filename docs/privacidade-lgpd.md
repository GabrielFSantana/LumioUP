# Privacidade e LGPD no LumioUP

> Documento técnico do que o app faz com os dados. **Não é parecer jurídico**: os textos de termos e de política
> de privacidade exibidos ao público precisam de revisão jurídica antes da publicação nas lojas.

## O que é coletado

| Dado | Para quê | Onde fica |
|---|---|---|
| E-mail e senha (hash gerenciado pelo Supabase Auth) | Entrar na conta | `auth.users` |
| Nome de exibição, fuso, nível de experiência | Perfil e personalização | `profiles` |
| Lançamentos, contas, categorias, investimentos, metas e contribuições | Função principal do app (entrada **manual**; não há conexão com bancos) | tabelas do próprio usuário |
| XP, nível, sequência, missões, conquistas, progresso de estudo | Gamificação e aprendizado | tabelas do próprio usuário |
| Preferências (ranking, notificações) e aceite de termos | Configurações e comprovação de consentimento | `user_settings`, `consents` |
| Participação em clubes e desafios | Recursos sociais, por escolha da pessoa | `club_members`, `challenge_participants` |

Não há analytics de terceiros, anúncios nem venda de dados. As notificações são **locais** (ADR 0002): nenhum token de
aparelho e nenhum texto de notificação passam pelo servidor.

## O que outras pessoas podem ver

- **Valores em reais, lançamentos, contas e metas nunca são compartilhados.** Os clubes não têm nenhuma coluna financeira.
- Membros de um clube veem **nome de exibição e papel**. Nível, XP e sequência só aparecem se a pessoa mantiver ligado
  "Aparecer no ranking dos clubes" (ela pode desligar a qualquer momento; passa a valer na hora).
- Desafios mostram apenas **percentual de progresso** e quantidade de ações.
- Isso é imposto no banco (RLS e funções) e testado em `supabase/tests/database/clubs.test.sql`,
  `challenges.test.sql` e `rls.test.sql`.

## Direitos do titular, no app (Perfil → Privacidade e dados)

- **Acesso e portabilidade — exportar:** `export_my_data()` devolve um JSON com todos os dados da própria pessoa
  (perfil, preferências, consentimentos, contas, categorias, lançamentos — inclusive os excluídos, marcados —,
  investimentos, metas, XP, missões, conquistas, progresso de estudo e a participação em clubes e desafios). Também há CSV só de
  lançamentos. De clubes e desafios saem apenas dados da própria pessoa, nunca de terceiros. O arquivo é gerado no
  momento e entregue ao aparelho; o app não o envia para nenhum outro lugar.
- **Eliminação — excluir a conta:** `delete_my_account()` apaga o usuário e **todo o resto sai em cascata**. O app pede a
  senha de novo antes (uma sessão esquecida aberta não basta) e um segundo toque de confirmação. O efeito é imediato e
  não há cópia reversível.
- **Clubes na exclusão:** se a pessoa é dona de um clube com outros membros, a propriedade passa ao admin mais antigo (ou ao
  membro mais antigo), para a exclusão não destruir o clube dos outros; se era a única pessoa, o clube é apagado. Desafios criados por ela permanecem, sem autor.
- **Consentimentos:** o aceite dos termos e da política (versão e data) é registrado no cadastro e fica visível na tela.
- **Correção:** nome, categorias, contas, lançamentos e metas podem ser editados no app.

O teste `supabase/tests/database/privacy.test.sql` garante que, depois da exclusão, **nenhuma tabela pública guarda
linhas** com `profile_id`/`owner_id` da pessoa (o teste varre todas as tabelas, então uma tabela nova com essa coluna já
entra na checagem), que clubes e dados de outras pessoas permanecem intactos e que a exportação não vaza dado de terceiros.

## Segurança

- Autorização no banco (RLS), com negação por padrão; escrita sensível só por funções no servidor.
- Funções de exportação e exclusão agem sempre sobre `auth.uid()`: não existe parâmetro para escolher outra pessoa.
- O CSV protege contra injeção de fórmula em planilhas (textos que começam com `=`, `+`, `-` ou `@` ganham um apóstrofo).
- Segredos nunca vão para o repositório (`apps/mobile/.env` fora do Git; só a chave pública anon é usada no app).

## Pendências conhecidas

- Revisão jurídica dos termos e da política antes de publicar; informar o contato do encarregado (DPO) exigido pela LGPD.
- O JWT já emitido continua tecnicamente válido até expirar (curta duração) após a exclusão, mas sem conta e sem dados;
  o app encerra a sessão local imediatamente.
- Backups do provedor (Supabase) seguem a política de retenção dele; informar o prazo na política de privacidade.
- Bloqueio por biometria (`user_settings.biometric_lock`) ainda não está implementado no app.
- Registro de auditoria (`audit_log`) de exportações não foi criado: não guardamos dados pessoais para provar que os apagamos.
