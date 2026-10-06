import { Ionicons } from '@expo/vector-icons';
import {
  CHALLENGE_KINDS,
  daysLeft,
  formatBrDate,
  progressLabel,
  progressPct,
  toDateString,
  type ChallengeStatus,
} from '@lumioup/core';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Chip, ProgressBar, Text } from '../../components/ui';
import { spacing, useTheme } from '../../theme';
import type { Challenge } from './api';

export const STATUS_LABELS: Record<ChallengeStatus, string> = {
  upcoming: 'Em breve',
  active: 'Em andamento',
  ended: 'Encerrado',
};

/** Texto de prazo, sem pressão: "Termina hoje", "Faltam 5 dias", "Começa em 12/10". */
export function deadlineText(challenge: Challenge, today = toDateString(new Date())): string {
  if (challenge.status === 'upcoming') return `Começa em ${formatBrDate(challenge.startsOn)}`;
  if (challenge.status === 'ended') return `Terminou em ${formatBrDate(challenge.endsOn)}`;
  const left = daysLeft(today, challenge.endsOn);
  if (left <= 1) return 'Termina hoje';
  return `Faltam ${left} dias`;
}

interface ChallengeCardProps {
  challenge: Challenge;
  onOpen: () => void;
}

/** Resumo do desafio: tipo, prazo e o progresso da própria pessoa em %. */
export function ChallengeCard({ challenge, onOpen }: ChallengeCardProps) {
  const { colors } = useTheme();
  const info = CHALLENGE_KINDS[challenge.kind];
  const percent = progressPct(challenge.myCount, challenge.target);
  const done = challenge.myCompletedAt !== null;
  const status = STATUS_LABELS[challenge.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${challenge.title}. ${info.label}. ${status}. ${deadlineText(challenge)}.${
        challenge.joined ? ` Seu progresso: ${percent}%.` : ' Você ainda não entrou.'
      }`}
      onPress={onOpen}
      style={({ pressed }) => ({ transform: [{ translateY: pressed ? 2 : 0 }] })}
    >
      <Card highlight={done}>
        <View style={styles.top}>
          <View style={{ flex: 1 }}>
            <Text variant="heading" numberOfLines={2}>
              {challenge.title}
            </Text>
            <Text variant="caption">{info.label}</Text>
          </View>
          {done ? (
            <Ionicons name="checkmark-circle" size={26} color={colors.income} />
          ) : (
            <Chip label={status} />
          )}
        </View>
        {challenge.joined ? (
          <>
            <ProgressBar
              percent={percent}
              color={done ? colors.income : undefined}
              label={`Seu progresso em ${challenge.title}`}
            />
            <Text variant="caption">
              {done
                ? 'Concluído!'
                : `${progressLabel(challenge.kind, challenge.myCount, challenge.target)} · ${percent}%`}
            </Text>
          </>
        ) : (
          <Text variant="caption">
            {challenge.status === 'ended' ? 'Você não participou.' : 'Toque para participar.'}
          </Text>
        )}
        <Text variant="caption">
          {`${deadlineText(challenge)} · ${challenge.participantCount} ${
            challenge.participantCount === 1 ? 'participante' : 'participantes'
          }`}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
