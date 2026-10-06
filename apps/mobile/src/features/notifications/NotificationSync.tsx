import { planNotifications, toDateString } from '@lumioup/core';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useUserStats } from '../gamification/hooks';
import { useGoals } from '../goals/hooks';
import { useNotificationPrefs } from './prefs';
import {
  getPermission,
  notificationsSupported,
  onNotificationOpened,
  syncSchedule,
} from './scheduler';

/**
 * Mantém os lembretes locais em dia: reagenda quando as preferências, as metas ou a atividade do
 * dia mudam e sempre que o app volta para o primeiro plano (o "agora" muda). Sem permissão ou com
 * tudo desligado, cancela o que estava agendado. Não renderiza nada.
 */
export function NotificationSync() {
  const router = useRouter();
  const prefs = useNotificationPrefs();
  const goals = useGoals();
  const stats = useUserStats();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!notificationsSupported) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => onNotificationOpened((route) => router.push(route as Href)), [router]);

  const ready = prefs.isSuccess && goals.isSuccess && stats.isSuccess;
  const deadlines = (goals.data ?? [])
    .filter((goal) => goal.status === 'active' && goal.deadline !== null)
    .map((goal) => ({ id: goal.id, deadline: goal.deadline as string }));
  const now = new Date();
  const today = toDateString(now);
  const activeToday = stats.data?.lastActiveOn === today;
  const key = JSON.stringify({ prefs: prefs.data, deadlines, activeToday, today, tick });

  useEffect(() => {
    if (!notificationsSupported || !ready || !prefs.data) return;
    let cancelled = false;
    void (async () => {
      const anyOn =
        prefs.data.dailyReminder ||
        prefs.data.weeklyReview ||
        prefs.data.goalDeadlines ||
        prefs.data.missions ||
        prefs.data.monthlySummary;
      const allowed = anyOn && (await getPermission()) === 'granted';
      if (cancelled) return;
      const current = new Date();
      const planned = allowed
        ? planNotifications({
            prefs: prefs.data,
            now: {
              date: toDateString(current),
              hour: current.getHours(),
              minute: current.getMinutes(),
            },
            activeToday,
            goals: deadlines,
          })
        : [];
      await syncSchedule(planned);
    })().catch(() => {
      // Falha ao agendar não deve derrubar o app; tenta de novo na próxima mudança.
    });
    return () => {
      cancelled = true;
    };
    // `key` resume todas as entradas do plano.
  }, [key, ready]);

  return null;
}
