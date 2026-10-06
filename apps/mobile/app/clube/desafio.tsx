import { Ionicons } from '@expo/vector-icons';
import {
  CHALLENGE_KINDS,
  canDeleteChallenge,
  formatBrDate,
  progressLabel,
  progressPct,
} from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  ConfirmButton,
  ProgressBar,
  Screen,
  Text,
  useToast,
} from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { friendlyChallengeError } from '../../src/features/challenges/api';
import { STATUS_LABELS, deadlineText } from '../../src/features/challenges/ChallengeCard';
import {
  useChallengeStandings,
  useChallenges,
  useDeleteChallenge,
  useJoinChallenge,
  useLeaveChallenge,
} from '../../src/features/challenges/hooks';
import { useMyClubs } from '../../src/features/clubs/hooks';
import { spacing, useTheme } from '../../src/theme';

export default function DesafioScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id?: string; club?: string }>();
  const { data: clubs } = useMyClubs();
  const club = clubs?.find((c) => c.clubId === params.club);
  const { data: challenges, isLoading } = useChallenges(params.club);
  const challenge = challenges?.find((c) => c.id === params.id);
  const standings = useChallengeStandings(challenge?.id);

  const join = useJoinChallenge();
  const leave = useLeaveChallenge();
  const del = useDeleteChallenge();
  const busy = join.isPending || leave.isPending || del.isPending;

  if (isLoading || !clubs) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }
  if (!challenge || !club) {
    return (
      <Screen withHeader>
        <Text>Esse desafio não existe mais.</Text>
        <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const info = CHALLENGE_KINDS[challenge.kind];
  const percent = progressPct(challenge.myCount, challenge.target);
  const done = challenge.myCompletedAt !== null;
  const ended = challenge.status === 'ended';
  const canDelete = canDeleteChallenge(club.role, challenge.createdBy === session?.user.id);

  const run = async (action: () => Promise<unknown>, success?: string, after?: () => void) => {
    try {
      await action();
      if (success) toast.show({ message: success });
      after?.();
    } catch (e) {
      toast.show({ message: friendlyChallengeError(e) });
    }
  };

  return (
    <Screen withHeader>
      <Card highlight={done}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text variant="title">{challenge.title}</Text>
            <Text variant="caption">{info.label}</Text>
          </View>
          <Chip label={STATUS_LABELS[challenge.status]} />
        </View>
        <Text>{info.description}</Text>
        <Text variant="caption">
          {`${formatBrDate(challenge.startsOn)} a ${formatBrDate(challenge.endsOn)} · ${deadlineText(challenge)}`}
        </Text>
        <Text variant="caption">
          {`Meta: ${challenge.target} ${challenge.target === 1 ? info.unitSingular : info.unitPlural}. Conta a partir do dia em que você entra.`}
        </Text>
      </Card>

      {challenge.joined ? (
        <Card highlight={done}>
          <View style={styles.top}>
            <Text variant="heading" style={{ flex: 1 }}>
              Seu progresso
            </Text>
            {done ? <Ionicons name="checkmark-circle" size={26} color={colors.income} /> : null}
          </View>
          <ProgressBar
            percent={percent}
            color={done ? colors.income : undefined}
            label={`Seu progresso: ${percent}%`}
          />
          <Text variant="caption">
            {done
              ? 'Concluído! O XP do desafio já foi somado.'
              : `${progressLabel(challenge.kind, challenge.myCount, challenge.target)} · ${percent}%`}
          </Text>
        </Card>
      ) : !ended ? (
        <Button
          label={join.isPending ? 'Entrando…' : 'Participar do desafio'}
          disabled={busy}
          onPress={() => run(() => join.mutateAsync(challenge.id), 'Você está no desafio')}
        />
      ) : null}

      <View style={{ gap: spacing.md }}>
        <Text variant="heading">Placar</Text>
        {standings.isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
        {standings.isError ? (
          <Text tone="danger">Não deu para carregar o placar. Tente de novo em instantes.</Text>
        ) : null}
        {(standings.data ?? []).map((row) => (
          <Card key={row.profileId} highlight={row.isSelf}>
            <View style={styles.top}>
              <Text variant="bodyBold" style={{ flex: 1 }}>
                {row.isSelf ? `${row.displayName} (você)` : row.displayName}
              </Text>
              {row.completed ? (
                <Chip label="Concluído" icon="checkmark-circle" tone="income" />
              ) : (
                <Text variant="bodyBold">{`${row.progressPct}%`}</Text>
              )}
            </View>
            <ProgressBar
              percent={row.progressPct}
              color={row.completed ? colors.income : undefined}
              label={`Progresso de ${row.displayName}: ${row.progressPct}%`}
            />
          </Card>
        ))}
        <Text variant="caption">
          O placar mostra só o percentual de cada pessoa. Quem prefere não aparecer no ranking fica
          de fora da lista dos outros.
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        {challenge.joined && !ended && !done ? (
          <ConfirmButton
            label="Sair do desafio"
            confirmLabel="Toque de novo para sair"
            disabled={busy}
            onConfirm={() => run(() => leave.mutateAsync(challenge.id), 'Você saiu do desafio')}
          />
        ) : null}
        {canDelete ? (
          <ConfirmButton
            label="Apagar desafio"
            confirmLabel="Toque de novo para apagar para todos"
            disabled={busy}
            onConfirm={() =>
              run(
                () => del.mutateAsync(challenge.id),
                'Desafio apagado',
                () => router.back(),
              )
            }
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
