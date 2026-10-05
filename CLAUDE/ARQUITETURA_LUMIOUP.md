# LumioUP — Análise e Arquitetura (pré-código)

Status: proposta para validação. Nenhum código foi escrito.
Base: `README_CLAUDE.MD`, `README_SKILLS.MD`, `REAME_PROGRESS.MD`.

---

## 0. Decisões-chave (resumo)

| Tema | Decisão | Motivo |
|---|---|---|
| Plataforma | React Native + Expo (TypeScript) | Um código para Android/iOS, builds via EAS, bom ecossistema |
| Backend | Supabase (Postgres + Auth + RLS + Edge Functions) | Clubes/ranking são relacionais e exigem isolamento de dados; RLS dá autorização no banco |
| Dinheiro | Inteiros em centavos (`bigint`), moeda BRL | Evita erro de ponto flutuante |
| Cálculos | Pacote TS puro (`packages/core`), sem dependência de UI/rede | 100% testável (exigência do briefing) |
| XP/conquistas | Calculados no servidor, ledger imutável | Anti-fraude e ranking confiável |
| Privacidade em clubes | Ranking só com XP/consistência; valores nunca saem do dono | Prioridade do briefing |
| Offline | MVP "online-first" com cache; fila offline fica pós-MVP | Reduz risco de conflito de sincronização |

---

## 1. Arquitetura recomendada

```
 App Mobile (Expo / React Native)
 ├─ UI (telas, componentes)
 ├─ Estado de servidor: TanStack Query (cache, retry)
 ├─ Estado local: Zustand (filtros, UI)
 └─ packages/core (cálculos financeiros, regras de XP, validações Zod)
            │ HTTPS (supabase-js, JWT)
            ▼
 Supabase
 ├─ Auth (e-mail/senha, Google/Apple depois)
 ├─ Postgres + RLS (toda tabela com user_id ou membership)
 ├─ Funções SQL / Views (agregações do dashboard, ranking)
 ├─ Edge Functions (concede XP, avalia conquistas/missões, exporta dados, exclui conta, push)
 ├─ Storage (anexos, avatares; bucket privado por usuário)
 └─ pg_cron (recorrências, missões diárias/semanais, lembretes)
```

Princípios:
1. **Fonte única da verdade dos cálculos**: `packages/core`. O app e os testes usam o mesmo código; agregações pesadas no servidor devem ter teste de paridade com o core.
2. **Autorização no banco (RLS)**, não só no app. Vazamento entre clubes é o maior risco de privacidade.
3. **Gamificação orientada a eventos**: lançamento criado → evento → regras avaliam → `xp_events` (ledger) → `user_stats` (cache derivado, recalculável).
4. **Módulos por feature** no app (feature-first), sem dependência cruzada entre features.

Trade-off: Supabase prende a um fornecedor, mas é Postgres padrão (migrações em SQL, portável). Alternativa (NestJS + Postgres próprio) dá mais controle, porém custa semanas de infraestrutura que o MVP não precisa.

---

## 2. Stack tecnológica

- **App**: Expo SDK atual, TypeScript estrito, Expo Router (navegação por arquivos)
- **UI**: componentes próprios sobre `react-native` + tokens de tema (claro/escuro); animações com Reanimated; gráficos com `victory-native` (Skia) ou `react-native-gifted-charts` (a decidir em protótipo na Etapa de Dashboard)
- **Dados**: `@supabase/supabase-js`, TanStack Query, Zod (validação compartilhada)
- **Formulários**: react-hook-form + Zod; teclado numérico com máscara de moeda
- **Segurança local**: `expo-secure-store` (sessão), bloqueio biométrico opcional (`expo-local-authentication`)
- **Notificações**: `expo-notifications` + Edge Function de envio
- **Testes**: Jest (core + unidade), React Native Testing Library, Maestro (E2E mobile), pgTAP ou testes SQL para RLS
- **Qualidade**: ESLint, Prettier, `tsc --noEmit`, GitHub Actions
- **Monorepo**: pnpm workspaces

---

## 3. Estrutura de pastas

```
LumioUP/
├─ CLAUDE/                      # documentos de contexto (já existe)
├─ docs/
│  ├─ decisions/                # ADRs (decisões importantes)
│  ├─ gamificacao.md            # tabela de XP, níveis, conquistas
│  └─ privacidade-lgpd.md
├─ apps/
│  └─ mobile/
│     ├─ app/                   # rotas Expo Router
│     │  ├─ (auth)/             # login, cadastro, recuperar senha
│     │  ├─ (onboarding)/
│     │  └─ (tabs)/             # inicio, lancamentos, metas, clubes, aprender
│     ├─ src/
│     │  ├─ features/
│     │  │  ├─ auth/ profile/ transactions/ categories/ accounts/
│     │  │  ├─ dashboard/ reports/ goals/ gamification/
│     │  │  ├─ clubs/ challenges/ education/ notifications/
│     │  │  └─ (cada uma: components/ hooks/ api/ screens/ types.ts)
│     │  ├─ components/ui/        # Button, Card, MoneyInput, ProgressBar...
│     │  ├─ lib/                  # supabase client, query client, formatadores
│     │  └─ theme/
│     └─ __tests__/
├─ packages/
│  └─ core/
│     ├─ src/
│     │  ├─ money/               # centavos, parse, format, rateio
│     │  ├─ finance/             # saldo, fluxo de caixa, patrimônio, % investido, comparativos
│     │  ├─ recurrence/          # geração de ocorrências
│     │  ├─ goals/
│     │  ├─ gamification/        # regras de XP, níveis, sequência
│     │  └─ schemas/             # Zod compartilhado
│     └─ tests/
├─ supabase/
│  ├─ migrations/                # SQL versionado
│  ├─ functions/                 # award-xp, export-data, delete-account, send-push
│  ├─ seed/                      # categorias padrão, níveis, conquistas, conteúdo inicial
│  └─ tests/                     # testes de RLS
└─ .github/workflows/
```

---

## 4. Modelo de dados

Convenções: `id uuid pk`, `created_at/updated_at timestamptz`, valores em centavos (`bigint`), exclusão lógica (`deleted_at`) nas tabelas financeiras para permitir desfazer e auditoria.

### Núcleo do usuário
- **profiles**: `id` (= auth.users.id), `display_name`, `avatar_url`, `bio`, `experience_level` (beginner/advanced), `currency` (BRL), `timezone`, `onboarding_done`
- **user_settings**: `profile_id`, `show_in_club_ranking` (bool), `share_amounts_with_clubs` (bool, default false), `notif_*`, `biometric_lock`
- **consents**: `profile_id`, `type` (termos, privacidade, ranking_valores), `version`, `accepted_at`

### Financeiro
- **accounts**: `profile_id`, `name`, `kind` (carteira, conta, investimento, outro), `opening_balance_cents`, `archived`
- **categories**: `profile_id` (decisão da Etapa 4: as categorias padrão são **copiadas para cada usuário** no cadastro, não compartilhadas; o usuário pode renomear e arquivar qualquer uma), `kind` (expense/income/investment, imutável), `name`, `icon`, `color` (8 chaves), `sort_order`, `is_archived`. Sem `delete`: só arquivar. Nome único por usuário e tipo, ignorando caixa.
- **transactions**: `profile_id`, `kind` (`income`, `expense`, `investment`, `redemption`, `profit`, `loss`, `transfer`), `amount_cents` (> 0, sinal derivado do `kind`), `occurred_on` (date), `account_id`, `to_account_id` (só transfer), `category_id`, `holding_id?`, `description`, `payment_method?`, `notes`, `recurring_rule_id?`, `is_classified`, `deleted_at`
  - CHECK: transfer exige `to_account_id ≠ account_id` e não tem categoria; demais exigem categoria do `kind` compatível.
- **tags** / **transaction_tags**
- **attachments**: `transaction_id`, `storage_path`, `mime`, `size`
- **recurring_rules**: `profile_id`, modelo do lançamento, `frequency`, `interval`, `starts_on`, `ends_on?`, `next_run_on`, `is_active`
- **holdings** (posições de investimento, simples): `profile_id`, `name`, `category_id`, `account_id?`. Aportes, resgates, lucros e perdas apontam para o `holding_id`.

### Metas
- **goals**: `profile_id`, `name`, `kind`, `target_cents`, `deadline`, `category_id?`, `status` (active/completed/paused/cancelled)
- **goal_contributions**: `goal_id`, `amount_cents` (pode ser negativo para retirada), `occurred_on`, `transaction_id?`

### Gamificação
- **xp_events** (ledger imutável): `profile_id`, `source` (transaction_created, classified, weekly_review, lesson_done, quiz_done, goal_done, challenge_done, streak), `source_ref`, `xp`, `idempotency_key` (UNIQUE), `occurred_at`
- **user_stats**: `profile_id`, `total_xp`, `level`, `current_streak`, `best_streak`, `last_active_on` (derivado, recalculável)
- **levels** (config): `level`, `name`, `min_xp`
- **achievements** (catálogo): `code`, `name`, `description`, `rule_json`, `xp_reward`
- **user_achievements**: `profile_id`, `achievement_id`, `unlocked_at`
- **mission_templates**: `code`, `period` (daily/weekly/monthly), `rule_json`, `xp_reward`
- **user_missions**: `profile_id`, `template_id`, `period_start`, `progress`, `target`, `completed_at`

### Clubes
- **clubs**: `owner_id`, `name`, `description`, `invite_code` (UNIQUE), `max_members`
- **club_members**: `club_id`, `profile_id`, `role` (owner/admin/member), `joined_at`, `ranking_opt_in`
- **club_invites**: `club_id`, `invited_by`, `token`, `expires_at`, `used_by?`
- **challenges**: `club_id`, `created_by`, `type` (`log_days`, `weekly_review`, `learning_track`, `save_amount`, `reduce_category`...), `title`, `starts_on`, `ends_on`, `target_json`
- **challenge_participants**: `challenge_id`, `profile_id`, `joined_at`
- **challenge_progress**: `challenge_id`, `profile_id`, `progress_pct` (0–100), `completed_at` — **só percentual, nunca valores**
- **club_reactions**: `club_id`, `from_id`, `to_id`, `target_type` (achievement/level), `emoji`
- **club_messages** (simples, opcional no MVP): `club_id`, `profile_id`, `body`

### Educação
- **content_items**: `type` (article/video/short/glossary), `title`, `body`, `topic`, `level`, `read_minutes`, `tags_json`
- **learning_tracks** / **track_items**: ordem de conteúdos
- **quizzes** / **quiz_questions** / **quiz_attempts**
- **content_progress**: `profile_id`, `content_id`, `completed_at`
- **content_rules**: regras de recomendação contextual (gatilho → conteúdo), ex.: assinaturas > X% dos gastos → "despesas recorrentes"

### Plataforma
- **notifications**: `profile_id`, `type`, `payload`, `read_at`, `sent_at`
- **device_tokens**: `profile_id`, `token`, `platform`
- **audit_log**: `profile_id`, `action`, `entity`, `entity_id`, `diff`, `at` (alterações em lançamentos, exportação, exclusão)
- **account_deletion_requests**

### Índices principais
- `transactions (profile_id, occurred_on desc)`, `(profile_id, kind, occurred_on)`, `(profile_id, category_id, occurred_on)` com `WHERE deleted_at IS NULL`
- `xp_events (profile_id, occurred_at)`, UNIQUE `idempotency_key`
- `club_members (profile_id)`, `(club_id)`; `clubs.invite_code` UNIQUE
- `user_missions (profile_id, period_start)`

### Regras de integridade
- Transferência nunca soma em receita/despesa (regra no core **e** nas views SQL).
- RLS: `profile_id = auth.uid()` em todas as tabelas pessoais. Dados de clube só por função `is_club_member()`.
- Ranking é uma view/função que expõe apenas `display_name, avatar, xp_periodo, streak, missões, conquistas`.
- `user_stats` pode ser reconstruído a partir de `xp_events`.

---

## 5. Entidades e relacionamentos

```
auth.users 1─1 profiles 1─1 user_settings
profiles 1─N accounts 1─N transactions N─1 categories
transactions N─M tags            transactions 1─N attachments
transactions N─1 recurring_rules transactions N─1 holdings
profiles 1─N goals 1─N goal_contributions (─? transactions)
profiles 1─N xp_events           profiles 1─1 user_stats
profiles N─M achievements (user_achievements)
profiles N─M mission_templates (user_missions)
profiles N─M clubs (club_members)  clubs 1─N challenges
challenges N─M profiles (challenge_participants / challenge_progress)
clubs 1─N club_invites, club_reactions, club_messages
learning_tracks N─M content_items   profiles N─M content_items (content_progress)
quizzes 1─N quiz_questions          profiles 1─N quiz_attempts
profiles 1─N notifications, device_tokens, audit_log
```

### Definições de cálculo (a testar no core)
- **Fluxo de caixa do período** = receitas − despesas (investimento/resgate/transferência ficam fora)
- **Total investido (líquido)** = aportes − resgates
- **Lucros e perdas** = Σ `profit` − Σ `loss`
- **Saldo do período** = receitas − despesas − aportes + resgates (o que sobrou em caixa)
- **% da renda investida** = aportes / receitas (0 quando não há receita)
- **Patrimônio líquido** = saldo inicial das contas + receitas − despesas + lucros − perdas
  (aportes, resgates e transferências só movem valor entre caixa e investimentos; versão anterior contava o investido em duplicidade. Corrigido na Etapa 1.)
  - Caixa = patrimônio − investido; Investido atual = aportes − resgates + lucros − perdas

---

## 6. Fluxo de navegação

```
Splash → (sem sessão) → Boas-vindas → Cadastro/Login
                                         └→ Onboarding (nível, objetivos, 1ª categoria, termos + aviso educacional)
                                              └→ Tabs
Tabs (barra inferior, 5 itens):
 1. Início     Dashboard (filtro dia/semana/mês/ano/custom) · missão atual · XP/nível · metas
               → Relatórios (gráficos) → detalhe por categoria
 2. Lançamentos  Lista + filtros + busca → Detalhe/Editar
               [+] botão central: Novo lançamento rápido (valor → tipo → categoria → salvar; resto opcional)
 3. Metas      Lista → Nova meta → Detalhe (contribuições, progresso)
 4. Clubes     Meus clubes → Criar / Entrar por código → Clube (ranking, desafios, reações)
               → Desafio (progresso em %)
 5. Aprender   Trilhas · Artigos · Glossário · Quiz
Perfil (ícone no topo do Início): conquistas, nível, configurações, privacidade,
        exportar dados, excluir conta, notificações
```

Regra de UX: registrar um gasto em ≤ 3 toques após abrir o formulário (valor, categoria, salvar).

---

## 7. Roadmap do MVP (etapas pequenas)

Cada etapa: explico o objetivo e os arquivos **antes**, implemento, rodo testes, relato e **aguardo seu OK** antes de seguir.

| # | Etapa | Entrega | Arquivos principais |
|---|---|---|---|
| 0 | **Fundação do repo** | Monorepo, TS, lint, CI, Jest rodando | configs raiz, `packages/core` vazio |
| 1 | **Core financeiro** | `money`, saldo, fluxo de caixa, % investido, transferências + testes extensivos | `packages/core/src/{money,finance}` |
| 2 | **App base** | Expo, tema claro/escuro, componentes UI, tabs vazias | `apps/mobile/*` |
| 3 | **Supabase + Auth** | Migrações iniciais, RLS, cadastro/login/logout, perfil | `supabase/migrations`, `features/auth` |
| 4 | **Categorias e contas** | Seed padrão, CRUD, personalização | `features/categories`, `accounts` |
| 5 | **Lançamentos** | Formulário rápido, lista, filtros, editar/excluir com desfazer | `features/transactions` |
| 6 | **Investimentos manuais** | Aporte, resgate, lucro, perda, posições | `holdings`, tipos no core |
| 7 | **Dashboard** | Cards, filtros de período, top categorias/receitas | `features/dashboard` |
| 8 | **Relatórios** | Gráficos básicos + textos comparativos neutros | `features/reports` |
| 9 | **Metas** | CRUD, contribuições, progresso, alerta de prazo | `features/goals` |
| 10 | **XP e níveis** | Ledger, regras, antiabuso, barra de progresso | `core/gamification`, `award-xp` |
| 11 | **Conquistas, missões, sequência** | Catálogo inicial, avaliação por evento | `features/gamification` |
| 12 | **Clubes** | Criar, código/convite, membros, RLS rigorosa | `features/clubs` |
| 13 | **Desafios e ranking** | Desafios coletivos, ranking só por XP/consistência | `features/challenges` |
| 14 | **Educação** | Artigos, glossário, 1 trilha, quiz, recomendação contextual | `features/education` |
| 15 | **Notificações** | Lembretes, metas, missões, preferências | `features/notifications` |
| 16 | **Privacidade/LGPD** | Exportar dados, exclusão definitiva, consentimentos | `export-data`, `delete-account` |
| 17 | **Qualidade e publicação** | E2E, acessibilidade, performance, builds EAS, beta fechado | `.github`, Maestro |

Marcos: **M1 (etapas 0–6)** registra finanças · **M2 (7–9)** entende finanças · **M3 (10–11)** gamificado · **M4 (12–13)** social · **M5 (14–17)** completo e publicável.

Sugestão de ordem de risco: validar cedo (etapa 3) que RLS + clubes funcionam, pois é a decisão mais cara de mudar depois.

---

## 8. Riscos técnicos e de produto

**Técnicos**
| Risco | Impacto | Mitigação |
|---|---|---|
| Vazamento de dados entre clubes (RLS errada) | Crítico | RLS por padrão negado, funções `SECURITY DEFINER` mínimas, testes SQL de permissão, revisão com skill security-privacy |
| Erros de cálculo (centavos, transferências, sinais) | Alto | Inteiros, core isolado, testes de casos extremos, teste de paridade SQL × TS |
| Fraude de XP (spam de lançamentos de R$ 0,01) | Alto | XP no servidor, idempotência, teto diário por fonte, rendimento decrescente, lançamentos inválidos não pontuam |
| Fuso horário (virada do dia, sequência) | Médio | Guardar `occurred_on` como date e `timezone` do perfil; sequência calculada no fuso do usuário |
| Recorrências duplicadas ou perdidas | Médio | Geração idempotente por (regra, data), job com `pg_cron` |
| Desempenho do dashboard com muitos lançamentos | Médio | Índices parciais, agregação em SQL, paginação, views materializadas se preciso |
| Escolha de biblioteca de gráficos | Baixo | Protótipo rápido na etapa 8 |
| Entrada manual cansa → abandono | **Alto (produto)** | Ver abaixo |
| Exclusão de conta incompleta (LGPD) | Alto | Função única que apaga em cascata + Storage, com teste |

**Produto**
- **Retenção da entrada manual**: é o risco nº 1. Mitigar com registro ultra-rápido, lançamentos recorrentes, atalhos de categorias recentes, lembretes moderados, e a gamificação premiando *consistência* (já previsto).
- **Gamificação que vira competição de renda**: ranking só com XP/consistência; desafios financeiros mostram só % de progresso.
- **Percepção de "recomendação de investimento"**: aviso educacional visível no onboarding e na área de conteúdo; revisão jurídica do texto antes de publicar.
- **Clubes vazios**: o valor social depende de amigos. Convite por link/código facilitado e experiência individual completa sem clube.
- **Conteúdo educativo**: precisa ser produzido e revisado; começar com poucos conteúdos de qualidade.
- **Lojas (Apple/Google)**: política de dados financeiros e exclusão de conta dentro do app são exigências; planejar na etapa 16.
- **Escopo**: o briefing é grande; o roadmap acima mantém cada etapa pequena e cortável.

---

## 9. Critérios de aceite (por módulo, MVP)

- **Auth/Perfil**: cadastrar, entrar, sair e recuperar senha; sessão persiste; editar nome/foto; excluir conta apaga todos os dados e a sessão em ≤ 1 min.
- **Lançamentos**: criar despesa em ≤ 3 toques após abrir; valor aceita centavos e rejeita ≤ 0; editar e excluir com desfazer; transferência não altera receita nem despesa; filtro por período, tipo e categoria.
- **Categorias**: padrões existem após cadastro; criar, editar, arquivar; categoria com lançamentos é arquivada, não apagada.
- **Investimentos**: registrar aporte, resgate, lucro e perda; total investido e lucro/perda corretos no dashboard.
- **Dashboard**: mostra receitas, gastos, investido, lucro/perda, saldo e % investido corretos para dia/semana/mês/ano/personalizado; carrega em < 2 s com 5.000 lançamentos.
- **Relatórios**: gastos por categoria e comparação mensal batem com a lista de lançamentos; textos usam linguagem neutra.
- **Metas**: criar, contribuir, progresso 0–100%, status muda ao atingir o valor, alerta de prazo.
- **Gamificação**: XP concedido uma única vez por evento (idempotente); teto diário respeitado; subida de nível e conquistas aparecem com feedback visual; sequência respeita o fuso do usuário.
- **Clubes**: criar, entrar por código, sair; não membro não consegue ler nada do clube (testado); ranking nunca mostra valores financeiros.
- **Desafios**: criar, participar, progresso em %, encerramento correto na data final.
- **Educação**: abrir artigo, concluir (gera XP), quiz com resultado, ao menos uma recomendação contextual funcionando; aviso educacional presente.
- **Privacidade**: exportar dados (JSON/CSV) completos; consentimentos registrados; nenhum dado financeiro em logs.
- **Geral**: funciona em telas pequenas (≈360 px), modo escuro, contraste AA, alvos de toque ≥ 44 px, leitor de tela nos fluxos principais.

---

## 10. Plano de testes

| Camada | O que testar | Ferramenta |
|---|---|---|
| **Cálculos (core)** | Saldo, fluxo de caixa, patrimônio, lucro/perda, % investido, comparativos, transferências, valores zero/negativos, arredondamento, centavos, recorrências (fim de mês, ano bissexto), metas | Jest — meta de cobertura ~100% do `core/finance` |
| **Gamificação (core)** | Regras de XP, limites diários, níveis, sequência com fuso, idempotência | Jest |
| **Unidade (app)** | Formatadores, máscara de moeda, hooks, validações | Jest + RNTL |
| **Componentes/UI** | Formulário rápido, estados vazios/erro/carregando, listas | RNTL |
| **Banco / RLS** | Usuário A não lê/escreve dados de B; não membro não lê clube; ranking não expõe valores; cascata na exclusão | pgTAP / testes SQL em CI |
| **Integração/API** | Funções Edge (award-xp, export, delete), constraints (CHECK de transferência) | Jest contra Supabase local (`supabase start`) |
| **Paridade** | Agregações SQL = funções do core com dataset fixo | Jest + SQL |
| **E2E** | Cadastro → lançar → ver dashboard → meta → entrar em clube | Maestro |
| **Privacidade** | Nada sensível em logs/analytics; exportação e exclusão completas | Teste automatizado + revisão manual |
| **Acessibilidade** | Contraste, tamanho de fonte dinâmico, leitor de tela, alvos de toque | Checklist manual + lint a11y |
| **Desempenho** | Dashboard com 5k–20k lançamentos, rolagem da lista | Dataset sintético + profiler |
| **Segurança** | Revisão de políticas RLS, segredos fora do app (só chave anon), validação no servidor | Revisão com skill security-privacy |

Regra de processo: nenhuma etapa que toque em dinheiro, XP ou permissões avança sem seus testes passando.

---

## 11. Perguntas para você validar (antes da Etapa 0)

1. **Patrimônio líquido**: implementado como *saldo inicial + receitas − despesas + lucros − perdas* (ver seção 5). Ou prefere o usuário informar manualmente o valor atual de cada investimento?
2. **Contas**: o MVP terá "contas" (carteira, banco) para dar sentido às transferências, ou só categorias? Recomendo contas simples (necessárias para transferência fazer sentido).
3. **Backend**: aceita **Supabase** (recomendado) ou prefere backend próprio?
4. **Login**: só e-mail/senha no MVP (Google/Apple depois)? Apple exige "Entrar com Apple" se houver login social no iOS.
5. **Plataforma inicial**: Android primeiro (publicação mais simples) e iOS depois, ou ambos?
6. **Idioma/moeda**: apenas pt-BR e BRL no MVP?

Se não houver objeção, minha proposta de padrão é: patrimônio como acima, contas simples, Supabase, e-mail/senha, Android primeiro, pt-BR/BRL.

**Próximo passo proposto**: Etapa 0 (fundação do repositório + `packages/core` com testes) e, em seguida, Etapa 1 (cálculos financeiros).
