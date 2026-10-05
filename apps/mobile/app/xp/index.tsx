import { Ionicons } from '@expo/vector-icons';
import { describeXpGain, formatBrDate } from '@lumioup/core';
import { StyleSheet, View } from 'react-native';
import { Card, Chip, EmptyState, Mascot, ProgressBar, Screen, Text } from '../../src/components/ui';
import { AchievementsGrid } from '../../src/features/gamification/AchievementsGrid';
import { MissionsCard } from '../../src/features/gamification/MissionsCard';
import {
  useAchievements,
  useLevelProgress,
  useLevels,
  useStreak,
  useXpEvents,
  useXpRules,
} from '../../src/features/gamification/hooks';
import { radius, spacing, useTheme } from '../../src/theme';

export default function JornadaScreen() {
  const { colors } = useTheme();
  const { progress, totalXp } = useLevelProgress();
  const { data: levels } = useLevels();
  const { data: rules } = useXpRules();
  const { data: events } = useXpEvents(20);
  const streak = useStreak();
  const achievements = useAchievements();

  const labelBySource = new Map((rules ?? []).map((r) => [r.source, r.label]));
  const currentLevel = progress?.current.level ?? 1;

  return (
    <Screen withHeader>
      {progress ? (
        <Card>
          <View style={styles.top}>
            <Mascot size={72} />
            <View style={{ flex: 1 }}>
              <Text variant="title">{`Nível ${progress.current.level}`}</Text>
              <Text variant="bodyBold">{progress.current.name}</Text>
            </View>
            <Chip label={`${totalXp} XP`} />
          </View>
          <ProgressBar percent={progress.percent} label="Progresso de XP no nível" />
          <Text variant="caption">
            {progress.isMax
              ? 'Você chegou ao último nível. Continue acendendo seus hábitos!'
              : `Faltam ${progress.xpToNext} XP para ${progress.next?.name}.`}
          </Text>
        </Card>
      ) : null}

      <Card>
        <View style={styles.top}>
          <Ionicons name="flame-outline" size={40} color={colors.streak} />
          <View style={{ flex: 1 }}>
            <Text variant="title">{`${streak.days} ${streak.days === 1 ? 'dia' : 'dias'}`}</Text>
            <Text variant="caption">{`Sua melhor sequência: ${streak.best} ${streak.best === 1 ? 'dia' : 'dias'}`}</Text>
          </View>
        </View>
        <Text>{streak.message}</Text>
      </Card>

      <MissionsCard />

      <Card>
        <View style={styles.rule}>
          <Text variant="heading" style={{ flex: 1 }}>
            Conquistas
          </Text>
          <Chip label={`${achievements.summary.unlocked} de ${achievements.summary.total}`} />
        </View>
        <AchievementsGrid items={achievements.items} />
      </Card>

      <Card>
        <Text variant="heading">Como ganhar XP</Text>
        <Text variant="caption">
          O XP vem das suas ações, nunca de valores em reais. Quanto você ganha, gasta ou investe
          não muda sua pontuação.
        </Text>
        {(rules ?? []).map((rule) => (
          <View key={rule.source} style={styles.rule}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">{rule.label}</Text>
              <Text variant="caption">
                {rule.dailyCap
                  ? `${rule.description} Até ${rule.dailyCap} por dia.`
                  : rule.description}
              </Text>
            </View>
            <Chip label={rule.variable ? 'Varia' : describeXpGain(rule.xp)} />
          </View>
        ))}
      </Card>

      <Card>
        <Text variant="heading">Níveis</Text>
        {(levels ?? []).map((level) => {
          const reached = level.level <= currentLevel;
          const isCurrent = level.level === currentLevel;
          return (
            <View
              key={level.level}
              accessible
              accessibilityLabel={`Nível ${level.level}, ${level.name}, ${level.minXp} XP. ${
                isCurrent ? 'Nível atual' : reached ? 'Alcançado' : 'Ainda não alcançado'
              }`}
              style={[
                styles.level,
                isCurrent && {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primaryEdge,
                },
              ]}
            >
              <Ionicons
                name={reached ? 'checkmark-circle' : 'lock-closed-outline'}
                size={22}
                color={reached ? colors.income : colors.textMuted}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyBold">{`${level.level}. ${level.name}`}</Text>
              </View>
              <Text variant="caption">{`${level.minXp} XP`}</Text>
            </View>
          );
        })}
      </Card>

      <Text variant="heading">Últimos ganhos</Text>
      {events && events.length === 0 ? (
        <EmptyState
          title="Seu XP começa aqui"
          hint="Registre um lançamento ou crie uma meta para ganhar seus primeiros pontos."
        />
      ) : null}
      {(events ?? []).map((event) => (
        <View
          key={event.id}
          style={[styles.event, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text variant="bodyBold">{labelBySource.get(event.source) ?? 'XP'}</Text>
            <Text variant="caption">{formatBrDate(event.awardedOn)}</Text>
          </View>
          <Text variant="bodyBold" tone="incomeInk">
            {describeXpGain(event.xp)}
          </Text>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rule: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
  },
});
