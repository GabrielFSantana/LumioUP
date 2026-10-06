import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@lumioup/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

const KEY = ['notification-prefs'] as const;

async function fetchPrefs(): Promise<NotificationPrefs> {
  const { data, error } = await supabase
    .from('user_settings')
    .select(
      'notif_daily_reminder, notif_daily_time, notif_weekly_review, notif_goal_deadlines, notif_missions, notif_monthly_summary',
    )
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_NOTIFICATION_PREFS;
  return {
    dailyReminder: data.notif_daily_reminder,
    dailyTime: data.notif_daily_time,
    weeklyReview: data.notif_weekly_review,
    goalDeadlines: data.notif_goal_deadlines,
    missions: data.notif_missions,
    monthlySummary: data.notif_monthly_summary,
  };
}

export const useNotificationPrefs = () => useQuery({ queryKey: KEY, queryFn: fetchPrefs });

function toRow(patch: Partial<NotificationPrefs>) {
  return {
    ...(patch.dailyReminder !== undefined && { notif_daily_reminder: patch.dailyReminder }),
    ...(patch.dailyTime !== undefined && { notif_daily_time: patch.dailyTime }),
    ...(patch.weeklyReview !== undefined && { notif_weekly_review: patch.weeklyReview }),
    ...(patch.goalDeadlines !== undefined && { notif_goal_deadlines: patch.goalDeadlines }),
    ...(patch.missions !== undefined && { notif_missions: patch.missions }),
    ...(patch.monthlySummary !== undefined && { notif_monthly_summary: patch.monthlySummary }),
  };
}

/** Salva uma ou mais preferências, mostrando a mudança na hora (e desfazendo se falhar). */
export function useSetNotificationPrefs() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      const profileId = session?.user.id;
      if (!profileId) throw new Error('Sessão ausente.');
      const { error } = await supabase
        .from('user_settings')
        .update(toRow(patch))
        .eq('profile_id', profileId);
      if (error) throw new Error(error.message);
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<NotificationPrefs>(KEY);
      qc.setQueryData<NotificationPrefs>(KEY, {
        ...(previous ?? DEFAULT_NOTIFICATION_PREFS),
        ...patch,
      });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
