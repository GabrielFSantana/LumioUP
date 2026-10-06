# ADR 0002 — Lembretes locais no celular, sem push remoto (por enquanto)

Data: 2026-10-07 · Status: aceita (Etapa 15)

## Contexto

O briefing pede notificações úteis e **não excessivas** (registrar movimentações, metas perto do prazo,
missões, evolução mensal, revisão semanal, atividades do clube e conquistas), com **privacidade
financeira como prioridade**. O plano original previa `expo-notifications` mais uma Edge Function de envio.

## Opções avaliadas

| Opção | Prós | Contras |
|---|---|---|
| Push remoto (Edge Function + `pg_cron` + tokens de aparelho) | Permite avisar sobre eventos de outras pessoas (clube) | Guarda tokens no servidor, passa texto por serviço de terceiros, exige credenciais EAS/FCM/APNs só obtidas na publicação, e não dá para testar aqui |
| **Lembretes locais agendados no aparelho** | Nenhum dado sai do celular, sem tokens nem servidor de envio, funciona offline e já no Expo Go, o texto é gerado sob controle do app | Só avisa o que o próprio aparelho sabe; reagenda quando o app abre |

## Decisão

Usar **lembretes locais** (`expo-notifications`, gatilho por data). O servidor guarda só as **preferências**
(`user_settings.notif_*`, tudo desligado por padrão) para valerem em qualquer aparelho.

- **Planejador puro** em `packages/core/src/notifications`: dado o "agora", as preferências, se já houve atividade
  hoje e os prazos das metas, devolve exatamente o que agendar. Testado sem depender do celular.
- **Não excessivo:** lembrete diário agenda no máximo 3 dias à frente (quem some recebe no máximo 3), não toca se a
  pessoa já registrou algo hoje, horários só entre 07:00 e 22:00, no máximo 5 metas, 2 domingos e 1 resumo mensal.
- **Privacidade:** textos genéricos, sem valores e sem nome de meta (notificações aparecem na tela bloqueada).
- A permissão do sistema só é pedida quando a pessoa liga a primeira opção.

## Consequências

- Ficam **para depois**: avisos de atividade do clube e de conquistas obtidas por outras pessoas, que exigem push
  remoto (tokens, EAS e servidor de envio). Conquistas da própria pessoa já aparecem dentro do app.
- Os lembretes só são reagendados quando o app é aberto ou volta ao primeiro plano; se a pessoa ficar dias sem abrir,
  recebe apenas o que já estava agendado (no máximo os 3 próximos dias).
- Só roda em Android/iOS. No navegador a tela de preferências funciona e salva, mas nada é disparado.
- Falta validar o disparo real em um aparelho ou emulador (Etapa 17).
