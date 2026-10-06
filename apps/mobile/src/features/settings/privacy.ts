import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../auth/AuthProvider';

const KEY = ['privacy-settings'] as const;

export interface PrivacySettings {
  /** Quando falso, nível, XP e sequência não aparecem para os membros dos clubes. */
  showInClubRanking: boolean;
}

async function fetchPrivacySettings(): Promise<PrivacySettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('show_in_club_ranking')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { showInClubRanking: data?.show_in_club_ranking ?? true };
}

export const usePrivacySettings = () => useQuery({ queryKey: KEY, queryFn: fetchPrivacySettings });

export function useSetShowInClubRanking() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (value: boolean) => {
      const profileId = session?.user.id;
      if (!profileId) throw new Error('Sessão ausente.');
      const { error } = await supabase
        .from('user_settings')
        .update({ show_in_club_ranking: value })
        .eq('profile_id', profileId);
      if (error) throw new Error(error.message);
    },
    onMutate: async (value) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<PrivacySettings>(KEY);
      qc.setQueryData<PrivacySettings>(KEY, { showInClubRanking: value });
      return { previous };
    },
    onError: (_error, _value, context) => {
      if (context?.previous) qc.setQueryData(KEY, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ['club-members'] });
    },
  });
}
