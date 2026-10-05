import { summarizeHoldings, totalInvestments, type Transaction } from '@lumioup/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useInvestmentTransactions } from '../transactions/hooks';
import { createHolding, fetchHoldings, updateHolding } from './api';

const KEY = ['holdings'] as const;

export const useHoldings = () => useQuery({ queryKey: KEY, queryFn: fetchHoldings });

export function useCreateHolding() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (input: { name: string; categoryId: string }) => {
      const profileId = session?.user.id;
      if (!profileId) throw new Error('Sessão ausente.');
      return createHolding(profileId, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateHolding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string } & Parameters<typeof updateHolding>[1]) =>
      updateHolding(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Resumo (valor atual, lucro/perda) de todas as posições, calculado pelo core. */
export function useInvestmentSummary() {
  const query = useInvestmentTransactions();
  const summaries = useMemo(
    () => summarizeHoldings((query.data ?? []) as Transaction[]),
    [query.data],
  );
  const totals = useMemo(() => totalInvestments(summaries.values()), [summaries]);
  return { ...query, summaries, totals };
}
