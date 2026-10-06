import { RANKING_PERIODS, type RankingPeriod } from '@lumioup/core';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, EmptyState, Screen, SegmentedControl, Text } from '../../src/components/ui';
import { friendlyChallengeError, type RankingRow } from '../../src/features/challenges/api';
import { useClubRanking } from '../../src/features/challenges/hooks';
import { spacing, useTheme } from '../../src/theme';

const PERIOD_HINT: Record<RankingPeriod, string> = {
  week: 'XP ganho desde domingo.',
  month: 'XP ganho neste mês.',
  all: 'XP de todo o tempo.',
};

function Row({ row }: { row: RankingRow }) {
  const { colors } = useTheme();
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const details = [
    `Nível ${row.level}`,
    row.currentStreak > 0 ? `${plural(row.currentStreak, 'dia seguido', 'dias seguidos')}` : null,
    row.missionsCompleted > 0 ? plural(row.missionsCompleted, 'missão', 'missões') : null,
    row.achievements > 0 ? plural(row.achievements, 'conquista', 'conquistas') : null,
  ].filter(Boolean);

  return (
    <Card highlight={row.isSelf}>
      <View
        accessible
        accessibilityLabel={`${row.rank ? `${row.rank}º lugar. ` : ''}${row.displayName}${
          row.isSelf ? ' (você)' : ''
        }. ${row.xp} XP. ${details.join(', ')}.`}
        style={styles.row}
      >
        <View
          style={[styles.rank, { backgroundColor: colors.background, borderColor: colors.border }]}
        >
          <Text variant="bodyBold">{row.rank ?? '–'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyBold" numberOfLines={1}>
            {row.isSelf ? `${row.displayName} (você)` : row.displayName}
          </Text>
          <Text variant="caption">{details.join(' · ')}</Text>
        </View>
        <Chip label={`${row.xp} XP`} />
      </View>
      {row.rank === null ? (
        <Text variant="caption">
          Só você vê esta linha: você escolheu não aparecer no ranking dos clubes.
        </Text>
      ) : null}
    </Card>
  );
}

export default function RankingScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [period, setPeriod] = useState<RankingPeriod>('week');
  const { data, isLoading, isError, error } = useClubRanking(id, period);

  return (
    <Screen withHeader>
      <SegmentedControl
        label="Período do ranking"
        options={RANKING_PERIODS}
        value={period}
        onChange={setPeriod}
      />
      <Text variant="caption">{PERIOD_HINT[period]}</Text>

      {isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
      {isError ? <Text tone="danger">{friendlyChallengeError(error)}</Text> : null}
      {!isLoading && !isError && (data ?? []).length === 0 ? (
        <EmptyState
          title="Ninguém no ranking ainda"
          hint="Registre lançamentos e complete missões para ganhar XP."
        />
      ) : null}
      {(data ?? []).map((row) => (
        <Row key={row.profileId} row={row} />
      ))}

      <Text variant="caption">
        O ranking usa só XP e consistência. Valores em reais, lançamentos, contas e metas nunca
        aparecem. Você controla se aparece em Perfil, em "Aparecer no ranking dos clubes".
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  rank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
