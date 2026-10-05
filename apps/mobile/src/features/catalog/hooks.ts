import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import {
  createAccount,
  createCategory,
  fetchAccounts,
  fetchCategories,
  updateAccount,
  updateCategory,
  type AccountInput,
  type CategoryInput,
} from './api';

const CATEGORIES_KEY = ['categories'] as const;
const ACCOUNTS_KEY = ['accounts'] as const;

function useProfileId(): string {
  const { session } = useAuth();
  const id = session?.user.id;
  if (!id) throw new Error('Sessão ausente.');
  return id;
}

export const useCategories = () => useQuery({ queryKey: CATEGORIES_KEY, queryFn: fetchCategories });

export const useAccounts = () => useQuery({ queryKey: ACCOUNTS_KEY, queryFn: fetchAccounts });

export function useCreateCategory() {
  const qc = useQueryClient();
  const profileId = useProfileId();
  return useMutation({
    mutationFn: (input: CategoryInput) => createCategory(profileId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string } & Parameters<typeof updateCategory>[1]) =>
      updateCategory(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORIES_KEY }),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  const profileId = useProfileId();
  return useMutation({
    mutationFn: (input: AccountInput) => createAccount(profileId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string } & Parameters<typeof updateAccount>[1]) =>
      updateAccount(id, changes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}
