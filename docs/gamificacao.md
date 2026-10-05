# Gamificação do LumioUP

Status: Etapa 10 (XP e níveis). Sequência, conquistas e missões chegam na Etapa 11.

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
