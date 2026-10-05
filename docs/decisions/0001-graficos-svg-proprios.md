# ADR 0001 — Gráficos desenhados em SVG, sem biblioteca de gráficos

Data: 2026-10-05 · Status: aceita (Etapa 8)

## Contexto

Os relatórios precisam de dois tipos de gráfico: **barras agrupadas** (receitas x gastos por mês)
e **linha com área** (patrimônio, investimentos). As telas já usam `react-native-svg`.

## Opções avaliadas

| Opção | Prós | Contras |
|---|---|---|
| `victory-native` / `react-native-skia` | Muito completa, animações | Dependência nativa pesada, exige build de desenvolvimento (não roda no Expo Go), web precisa de CanvasKit |
| `react-native-gifted-charts` | Pronta, só JS sobre SVG | Visual genérico, difícil de alinhar à identidade Luz, acessibilidade limitada |
| **SVG próprio sobre `react-native-svg`** | Zero dependência nova, visual 100% da identidade, descrição em texto para leitores de tela, escala testável no core | Mais código nosso para manter; sem animações prontas |

## Decisão

Desenhar `BarChart` e `LineChart` em `apps/mobile/src/components/charts`, com a matemática de escala
(`niceMax`, formato compacto de valores) no `packages/core`, coberta por testes.

## Consequências

- Cada gráfico recebe um texto de resumo (`accessibilityLabel`) e tem leitura em texto ao tocar.
- Se surgirem gráficos mais complexos (pizza, dispersão, zoom), reavaliar esta decisão.
- Sem animações de entrada por enquanto; respeita "reduzir movimento" por padrão.
