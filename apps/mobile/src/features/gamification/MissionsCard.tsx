import { Ionicons } from '@expo/vector-icons';
import { describeXpGain, type MissionRow } from '@lumioup/core';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, ProgressBar, Text } from '../../components/ui';
import { spacing, useTheme } from '../../theme';
import { useMissions } from './hooks';

function Row({ row }: { row: MissionRow }) {
  const { colors } = useTheme();
  const { template } = row;
  return (
    <View
      accessible
      accessibilityLabel={`${template.title}. ${
        row.completed ? 'Concluída' : `${row.progress} de ${template.target}`
      }. ${describeXpGain(template.xpReward)}`}
      style={styles.row}
    >
      <View style={styles.line}>
        <View style={styles.titleWrap}>
          {row.completed ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.income} />
          ) : null}
          <Text variant="bodyBold" style={{ flexShrink: 1 }}>
            {template.title}
          </Text>
        </View>
        <Chip label={describeXpGain(template.xpReward)} />
      </View>
      <ProgressBar
        percent={row.percent}
        color={row.completed ? colors.income : undefined}
        label={`Progresso: ${template.title}`}
      />
      <Text variant="caption">
        {row.completed
          ? 'Concluída'
          : `${Math.min(row.progress, template.target)} de ${template.target}`}
      </Text>
    </View>
  );
}

/** Missões do dia e da semana, com progresso e XP. */
export function MissionsCard() {
  const { rows, isLoading } = useMissions();
  if (isLoading || rows.length === 0) return null;
  const daily = rows.filter((r) => r.template.period === 'daily');
  const weekly = rows.filter((r) => r.template.period === 'weekly');
  return (
    <Card>
      <Text variant="heading">Missões</Text>
      {daily.length > 0 ? (
        <View style={styles.group}>
          <Text variant="caption">Hoje</Text>
          {daily.map((r) => (
            <Row key={r.template.code} row={r} />
          ))}
        </View>
      ) : null}
      {weekly.length > 0 ? (
        <View style={styles.group}>
          <Text variant="caption">Esta semana</Text>
          {weekly.map((r) => (
            <Row key={r.template.code} row={r} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  row: { gap: 6 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, flexShrink: 1 },
});
