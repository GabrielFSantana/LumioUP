# Gamificação do LumioUP

Status: Etapas 10 (XP e níveis) e 11 (sequência, missões e conquistas).

## Princípios

1. **Premia ações, nunca valores.** Quanto o usuário ganha, gasta ou investe não muda a pontuação.
   Registrar R$ 0,01 e R$ 1 milhão rende o mesmo XP.
2. **Servidor é a fonte da verdade.** O XP só é concedido por gatilhos no banco. O app lê, nunca escreve.
   Os usuários não têm permissão de inserir em `xp_events`, alterar `user_stats` nem chamar `award_xp`.
3. **Livro-razão imutável.** Cada ganho é uma linha em `xp_events`; `user_stats` é derivado e recalculável.
4. **Cada ação rende XP uma única vez.** Chave de idempotência por ação (`tx:<id>`, `goal_completed:<id>`...):
   excluir e restaurar, ou reabrir e concluir de novo, não rende XP duplo.
5. **Sem competição por dinheiro.** Nada no XP expõe valores. O ranking de clubes (Etapa 13) usa só XP e consistência.
6. **Tom positivo.** Nenhuma mensagem de "você perdeu XP"; quando o limite do dia é atingido, nada é mostrado.

## Regras atuais (`xp_rules`)

| Ação | XP | Limite por dia |
|---|---|---|
| Registrar lançamento | 10 | 5 |
| Criar meta | 20 | 1 |
| Guardar para uma meta | 5 | 2 |
| Concluir uma meta | 50 | uma vez por meta |
| Concluir um desafio do clube | 40 | 2 |
| Ler um artigo (marcar como lido) | 15 | 3, uma vez por artigo |
| Passar no quiz de um artigo (2 de 3) | 20 | 3, uma vez por artigo |
| Concluir a trilha (ler todos os artigos) | 50 | uma vez por trilha |

As regras ficam no banco e podem ser ajustadas sem publicar um novo app. O app mostra essas regras na tela Jornada.
Próximas fontes: conteúdos e questionários (Etapa 14), revisão semanal e missões (Etapa 11).

## Proteção contra abuso

- **Limite diário** por tipo de ação, contado no dia do usuário (fuso do perfil).
- **Lançamento idêntico** (mesmo tipo, valor, data, conta, categoria e posição) a um já existente não rende XP.
- **Excluir não "devolve" a vez**: o limite conta eventos concedidos, não lançamentos existentes.
- **Valores mínimos** já são barrados pelo banco (valor >= 1 centavo).
- Com 5 lançamentos por dia o teto de XP de lançamentos é 50 XP/dia: uma pessoa muito engajada
  leva cerca de 2 dias para o nível 2 e semanas para os níveis intermediários.

## Níveis (`levels`)

| Nível | Nome | XP total |
|---|---|---|
| 1 | Curioso Financeiro | 0 |
| 2 | Organizador | 100 |
| 3 | Poupador | 250 |
| 4 | Planejador | 500 |
| 5 | Investidor Iniciante | 900 |
| 6 | Investidor Consistente | 1.500 |
| 7 | Estrategista Financeiro | 2.400 |
| 8 | Mestre da Jornada Financeira | 3.600 |

Os nomes não implicam patrimônio ou conhecimento de mercado; são etapas de hábito e aprendizado.

## Comemoração de nível

`user_stats.celebrated_level` guarda o último nível já comemorado. Quando `level > celebrated_level`
o app mostra a tela de subida de nível uma vez e chama `acknowledge_level()` ao continuar.
A tela respeita "reduzir movimento": não há animação.

## Sequência (Etapa 11)

- **Dia organizado** = dia em que o usuário **faz** uma ação (registrar lançamento, criar meta ou guardar
  para uma meta), no fuso do perfil. A data do lançamento não importa: lançar datas antigas não estende a sequência.
- Cada dia organizado rende **+5 XP** (uma vez por dia).
- Se o último dia ativo foi ontem, a sequência está "em risco" (continua se houver atividade hoje);
  se passou mais de um dia, ela recomeça em 1 na próxima atividade. O **recorde** é sempre mantido.
- Mensagens neutras: "Sua sequência recomeça hoje. Quando quiser!". Nunca culpa, nunca alarme.
- Ideia futura: **dia de descanso** (uma folga por semana sem quebrar a sequência), para reduzir a ansiedade.

## Missões

Modelos em `mission_templates` (ajustáveis sem novo app), progresso em `user_missions` por período
(dia ou semana de domingo a sábado, no fuso do usuário). Cada missão rende XP **uma vez por período**.

| Missão | Período | Alvo | XP |
|---|---|---|---|
| Registre 2 lançamentos | diária | 2 | 15 |
| Guarde para uma meta | diária | 1 | 10 |
| Cinco dias organizados | semanal | 5 dias | 40 |
| Dez lançamentos na semana | semanal | 10 | 30 |

Anti-abuso: só contam lançamentos e contribuições **que renderam XP** (distintos e dentro do limite diário).

## Conquistas

Catálogo em `achievements`, desbloqueio avaliado no servidor depois de cada ação (e repetido até 3 vezes,
porque o XP de uma conquista pode subir o nível e liberar outra). Cada uma rende XP uma única vez.

Primeiro passo (1 lançamento), Pegando o ritmo (10), Organização em dia (50), Com um objetivo (1ª meta),
Guardando (1ª contribuição), Meta cumprida, Primeiro aporte, Três dias seguidos, Semana organizada (7 dias),
Mês inteiro (30 dias) e Planejador (nível 4). Os textos descrevem ações, sem nenhuma recomendação.

## Desafios e ranking dos clubes (Etapa 13)

Regra `challenge_done`: 40 XP, no máximo 2 por dia, uma vez por desafio.

- **Só ações, nunca valores em reais.** Tipos: dias organizados (`activity_days`), lançamentos
  registrados e contribuições em metas (contados a partir do `xp_events` já concedido, então valem os mesmos
  limites diários: até 5 lançamentos e 2 contribuições por dia). Desafios de "economizar R$ X" ou
  "reduzir uma categoria" ficaram de fora de propósito: exigiriam expor ou comparar valores.
- **Progresso calculado no servidor** (`challenge_count`), contando só o que foi feito a partir do dia em que a
  pessoa entrou. A conclusão e o XP saem de gatilhos em `activity_days` e `xp_events`; o app só lê.
- **Contra abuso:** só dono/admin criam; duração de 1 a 90 dias; metas mínimas por tipo; no máximo 5 desafios
  ativos ou marcados por clube; o XP só vale em clube com 2+ membros.
- **Ranking** (`club_ranking`): XP da semana (desde domingo), do mês ou geral, mais sequência, missões e
  conquistas. Quem desligou "Aparecer no ranking dos clubes" não aparece para os outros, nem no ranking nem no
  placar do desafio; só vê a própria linha, sem posição. Nenhuma coluna monetária existe nessas tabelas.

## Educação (Etapa 14)

- **Conteúdo no banco** (`articles`, `glossary_terms`, `learning_tracks`, `quiz_questions`): só leitura para o app, em
  português, neutro e sem recomendar produtos. Os números dos exemplos são ilustrativos. Vale revisão jurídica do
  texto antes da publicação na loja, e o aviso educacional aparece na aba Aprender e em cada artigo.
- **Gabarito escondido:** o app lê as perguntas e opções, mas não `correct_index` nem `explanation` (permissão por
  coluna). A correção é a função `submit_quiz`, que devolve o gabarito só depois das respostas.
- **XP uma vez por artigo/quiz/trilha**, com limite de 3 leituras e 3 quizzes por dia. Se o limite do dia já foi
  usado, o artigo ainda fica como lido (só o XP daquele dia não é concedido). Ler ou passar no quiz conta como dia
  organizado. Conquistas novas: "Primeira lição" (1 artigo) e "Estudioso" (5).
- **Recomendação contextual** (`recommended_articles`): olha os últimos 30 dias no servidor (saídas acima das
  entradas, várias assinaturas, primeiro aporte, gasto que cresceu 30% ou mais, nenhuma meta) e devolve só o artigo e
  um motivo genérico, sem valores. Completa com o próximo passo da trilha. Vídeos ficaram de fora por não haver mídia.

## Nada disso é escrito pelo app

`activity_days`, `user_missions`, `user_achievements` e as colunas de sequência de `user_stats` são só de leitura
para os usuários; as funções que os alteram não têm permissão de execução para o app (testado em
`supabase/tests/database/gamification.test.sql`).
