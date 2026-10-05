import type { Period } from '@lumioup/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import {
  createTransaction,
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
  const { session } = useAuth();
  return useMutation({
    mutationFn: (input: TransactionInput) => {
      const profileId = session?.user.id;
      if (!profileId) throw new Error('Sessão ausente.');
      return createTransaction(profileId, input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
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
