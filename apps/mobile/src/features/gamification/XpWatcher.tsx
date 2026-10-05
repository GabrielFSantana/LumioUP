import { describeXpGain } from '@lumioup/core';
import { useEffect, useRef } from 'react';
import { useToast } from '../../components/ui';
import { useUserStats } from './hooks';

/**
 * Mostra "+N XP" quando o total sobe. A primeira leitura só guarda o valor (sem aviso),
 * para não comemorar o XP que já existia ao abrir o app. Quando o limite do dia é atingido
 * nada é mostrado: o app nunca avisa sobre XP que "deixou de ganhar".
 */
export function XpWatcher() {
  const { data } = useUserStats();
  const toast = useToast();
  const previous = useRef<number | null>(null);
  const total = data?.totalXp;

  useEffect(() => {
    if (total === undefined) return;
    if (previous.current !== null && total > previous.current) {
      toast.show({ message: describeXpGain(total - previous.current) });
    }
    previous.current = total;
  }, [total, toast]);

  return null;
}
