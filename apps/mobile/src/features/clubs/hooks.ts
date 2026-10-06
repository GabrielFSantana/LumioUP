import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createClub,
  deleteClub,
  joinClub,
  leaveClub,
  listClubMembers,
  listMyClubs,
  regenerateInviteCode,
  removeMember,
  setMemberRole,
  transferOwnership,
  updateClub,
} from './api';

const CLUBS_KEY = ['clubs'] as const;
const MEMBERS_KEY = ['club-members'] as const;

export const useMyClubs = () => useQuery({ queryKey: CLUBS_KEY, queryFn: listMyClubs });

export const useClubMembers = (clubId: string | undefined) =>
  useQuery({
    queryKey: [...MEMBERS_KEY, clubId],
    queryFn: () => listClubMembers(clubId as string),
    enabled: Boolean(clubId),
  });

/** Qualquer mudança em clube ou membros invalida as duas listas. */
function useInvalidateClubs() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: CLUBS_KEY }),
      qc.invalidateQueries({ queryKey: MEMBERS_KEY }),
    ]);
}

export function useCreateClub() {
  const invalidate = useInvalidateClubs();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      createClub(name, description),
    onSuccess: invalidate,
  });
}

export function useJoinClub() {
  const invalidate = useInvalidateClubs();
  return useMutation({ mutationFn: (code: string) => joinClub(code), onSuccess: invalidate });
}

export function useUpdateClub() {
  const invalidate = useInvalidateClubs();
  return useMutation({
    mutationFn: ({
      clubId,
      ...input
    }: { clubId: string } & { name: string; description: string; invitesEnabled: boolean }) =>
      updateClub(clubId, input),
    onSuccess: invalidate,
  });
}

export function useRegenerateCode() {
  const invalidate = useInvalidateClubs();
  return useMutation({
    mutationFn: (clubId: string) => regenerateInviteCode(clubId),
    onSuccess: invalidate,
  });
}

export function useDeleteClub() {
  const invalidate = useInvalidateClubs();
  return useMutation({ mutationFn: (clubId: string) => deleteClub(clubId), onSuccess: invalidate });
}

export function useLeaveClub() {
  const invalidate = useInvalidateClubs();
  return useMutation({ mutationFn: (clubId: string) => leaveClub(clubId), onSuccess: invalidate });
}

export function useRemoveMember() {
  const invalidate = useInvalidateClubs();
  return useMutation({
    mutationFn: ({ clubId, profileId }: { clubId: string; profileId: string }) =>
      removeMember(clubId, profileId),
    onSuccess: invalidate,
  });
}

export function useSetMemberRole() {
  const invalidate = useInvalidateClubs();
  return useMutation({
    mutationFn: ({
      clubId,
      profileId,
      role,
    }: {
      clubId: string;
      profileId: string;
      role: 'admin' | 'member';
    }) => setMemberRole(clubId, profileId, role),
    onSuccess: invalidate,
  });
}

export function useTransferOwnership() {
  const invalidate = useInvalidateClubs();
  return useMutation({
    mutationFn: ({ clubId, profileId }: { clubId: string; profileId: string }) =>
      transferOwnership(clubId, profileId),
    onSuccess: invalidate,
  });
}
