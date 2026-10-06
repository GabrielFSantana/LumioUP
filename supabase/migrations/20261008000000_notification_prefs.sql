-- Etapa 15: preferências de notificação.
-- As notificações são LOCAIS (agendadas no celular), então o servidor guarda só o que a pessoa
-- escolheu, para valer em qualquer aparelho. Tudo começa desligado: ninguém é incomodado sem pedir.
-- Nenhum token de aparelho e nenhum conteúdo financeiro são guardados aqui.
alter table public.user_settings
  add column notif_daily_reminder boolean not null default false,
  add column notif_daily_time text not null default '20:00',
  add column notif_weekly_review boolean not null default false,
  add column notif_goal_deadlines boolean not null default false,
  add column notif_missions boolean not null default false,
  add column notif_monthly_summary boolean not null default false,
  -- Horário do lembrete diário entre 07:00 e 22:00 (nada de madrugada).
  add constraint user_settings_notif_daily_time_check
    check (notif_daily_time ~ '^(0[7-9]|1[0-9]|2[0-1]):[0-5][0-9]$' or notif_daily_time = '22:00');
