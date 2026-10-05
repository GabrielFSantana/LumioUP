import type { Period } from '@lumioup/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import { useRefreshXp } from '../gamification/hooks';
import {
  createTransaction,
  fetchAllTransactions,
  fetchInvestmentTransactions,
  fetchTransaction,
  fetchTransactions,
  setTransactionDeleted,
  updateTransaction,
  type TransactionInput,
} from './api';

const KEY = ['transactions'] as const;

export const useTransactions = (period: Period) =>
  useQuery({
    queryKey: [...KEY, period.from, period.to],
    queryFn: () => fetchTransactions(period),
  });

/** Todos os lançamentos (alimenta o painel do Início). Invalida junto com os demais. */
export const useAllTransactions = () =>
  useQuery({ queryKey: [...KEY, 'all'], queryFn: fetchAllTransactions });

export const useInvestmentTransactions = () =>
  useQuery({ queryKey: [...KEY, 'investments'], queryFn: fetchInvestmentTransactions });

export const useTransaction = (id: string | undefined) =>
  useQuery({
    queryKey: [...KEY, 'one', id],
    queryFn: () => fetchTransaction(id as string),
    enabled: Boolean(id),
  });

export function useCreateTransaction() {
  const qc = useQueryClient();
  const refreshXp = useRefreshXp();
  const { session } = useAuth();
  return useMutation({
    mutationFn: (input: TransactionInput) => {
      const profileId = session?.user.id;
      if (!profileId) throw new Error('Sessão ausente.');
      return createTransaction(profileId, input);
    },
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: KEY }), refreshXp()]),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      updateTransaction(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetTransactionDeleted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, deleted }: { id: string; deleted: boolean }) =>
      setTransactionDeleted(id, deleted),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
