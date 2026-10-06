import {
  CLUB_ROLE_LABELS,
  buildInviteMessage,
  canDeleteClub,
  canEditClub,
  canRegenerateCode,
  formatInviteCode,
  leaveOutcome,
  type MemberAction,
} from '@lumioup/core';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share, StyleSheet, Switch, View } from 'react-native';
import { Button, Card, Chip, ConfirmButton, Screen, Text, useToast } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { friendlyClubError, type ClubMember } from '../../src/features/clubs/api';
import {
  useClubMembers,
  useDeleteClub,
  useLeaveClub,
  useMyClubs,
  useRegenerateCode,
  useRemoveMember,
  useSetMemberRole,
  useTransferOwnership,
  useUpdateClub,
} from '../../src/features/clubs/hooks';
import { MemberRow } from '../../src/features/clubs/MemberRow';
import { radius, spacing, useTheme } from '../../src/theme';

export default function ClubeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const { data: clubs, isLoading } = useMyClubs();
  const club = clubs?.find((c) => c.clubId === params.id);
  const members = useClubMembers(club?.clubId);

  const update = useUpdateClub();
  const regenerate = useRegenerateCode();
  const leave = useLeaveClub();
  const remove = useRemoveMember();
  const setRole = useSetMemberRole();
  const transfer = useTransferOwnership();
  const del = useDeleteClub();
  const busy =
    update.isPending ||
    regenerate.isPending ||
    leave.isPending ||
    remove.isPending ||
    setRole.isPending ||
    transfer.isPending ||
    del.isPending;

  if (isLoading) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }
  if (!club) {
    return (
      <Screen withHeader>
        <Text>Você não faz parte deste clube (ou ele foi apagado).</Text>
        <Button
          label="Voltar aos clubes"
          variant="secondary"
          onPress={() => router.replace('/clubes')}
        />
      </Screen>
    );
  }

  const me = session?.user.id;
  const canEdit = canEditClub(club.role);
  const outcome = leaveOutcome(club.role, club.memberCount);

  const run = async (action: () => Promise<unknown>, success?: string, after?: () => void) => {
    try {
      await action();
      if (success) toast.show({ message: success });
      after?.();
    } catch (e) {
      toast.show({ message: friendlyClubError(e) });
    }
  };

  const copyCode = () =>
    run(async () => {
      await Clipboard.setStringAsync(formatInviteCode(club.inviteCode));
    }, 'Código copiado');

  const share = () =>
    run(async () => {
      await Share.share({ message: buildInviteMessage(club.name, club.inviteCode) });
    });

  const onMemberAction = (action: MemberAction, member: ClubMember) => {
    const base = { clubId: club.clubId, profileId: member.profileId };
    if (action === 'remove') {
      void run(() => remove.mutateAsync(base), `${member.displayName} saiu do clube`);
    } else if (action === 'promote') {
      void run(() => setRole.mutateAsync({ ...base, role: 'admin' }), 'Agora é admin');
    } else if (action === 'demote') {
      void run(() => setRole.mutateAsync({ ...base, role: 'member' }), 'Voltou a ser membro');
    } else {
      void run(() => transfer.mutateAsync(base), 'Propriedade transferida');
    }
  };

  return (
    <Screen withHeader>
      <Card>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="title">{club.name}</Text>
            <Text variant="caption">{`${club.memberCount} de ${club.maxMembers} membros`}</Text>
          </View>
          <Chip label={CLUB_ROLE_LABELS[club.role]} />
        </View>
        {club.description ? <Text>{club.description}</Text> : null}
        <Text variant="caption">
          Aqui aparecem só nome, nível e XP. Valores em reais, lançamentos, contas e metas nunca são
          compartilhados.
        </Text>
      </Card>

      <Card>
        <Text variant="heading">Convite</Text>
        {club.invitesEnabled ? (
          <>
            <View
              style={[
                styles.code,
                { backgroundColor: colors.primarySoft, borderColor: colors.primaryEdge },
              ]}
            >
              <Text
                variant="display"
                style={{ letterSpacing: 4 }}
                accessibilityLabel={`Código ${club.inviteCode.split('').join(' ')}`}
              >
                {formatInviteCode(club.inviteCode)}
              </Text>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button label="Copiar código" variant="secondary" onPress={copyCode} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Compartilhar" onPress={share} />
              </View>
            </View>
          </>
        ) : (
          <Text tone="textMuted">A entrada por código está desligada neste clube.</Text>
        )}
        {canRegenerateCode(club.role) ? (
          <>
            <View style={styles.switchRow}>
              <Switch
                accessibilityLabel="Permitir entrada por código"
                value={club.invitesEnabled}
                disabled={busy}
                onValueChange={(value) =>
                  run(() =>
                    update.mutateAsync({
                      clubId: club.clubId,
                      name: club.name,
                      description: club.description ?? '',
                      invitesEnabled: value,
                    }),
                  )
                }
                trackColor={{ true: colors.primaryEdge, false: colors.border }}
                thumbColor={club.invitesEnabled ? colors.primary : colors.surface}
              />
              <Text variant="bodyBold" style={{ flex: 1 }}>
                Permitir entrada por código
              </Text>
            </View>
            <ConfirmButton
              label="Renovar código"
              confirmLabel="Toque de novo: o código antigo deixa de valer"
              disabled={busy}
              onConfirm={() => run(() => regenerate.mutateAsync(club.clubId), 'Código renovado')}
            />
          </>
        ) : null}
      </Card>

      <View style={{ gap: spacing.md }}>
        <Text variant="heading">Membros</Text>
        {members.isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
        {members.isError ? (
          <Text tone="danger">Não deu para carregar os membros. Tente de novo em instantes.</Text>
        ) : null}
        {(members.data ?? []).map((member) => (
          <MemberRow
            key={member.profileId}
            member={member}
            actorRole={club.role}
            isSelf={member.profileId === me}
            busy={busy}
            onAction={onMemberAction}
          />
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
        {canEdit ? (
          <Button
            label="Editar clube"
            variant="secondary"
            onPress={() => router.push({ pathname: '/clube/form', params: { id: club.clubId } })}
          />
        ) : null}
        {outcome === 'must_transfer' ? (
          <Text variant="caption">
            Para sair, passe a propriedade para outro membro (na lista acima).
          </Text>
        ) : (
          <ConfirmButton
            label={outcome === 'delete_club' ? 'Sair e apagar o clube' : 'Sair do clube'}
            confirmLabel="Toque de novo para sair"
            disabled={busy}
            onConfirm={() =>
              run(
                () => leave.mutateAsync(club.clubId),
                outcome === 'delete_club' ? 'Clube apagado' : 'Você saiu do clube',
                () => router.replace('/clubes'),
              )
            }
          />
        )}
        {canDeleteClub(club.role) && outcome !== 'delete_club' ? (
          <ConfirmButton
            label="Apagar clube"
            confirmLabel="Toque de novo para apagar para todos"
            disabled={busy}
            onConfirm={() =>
              run(
                () => del.mutateAsync(club.clubId),
                'Clube apagado',
                () => router.replace('/clubes'),
              )
            }
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  code: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
});
