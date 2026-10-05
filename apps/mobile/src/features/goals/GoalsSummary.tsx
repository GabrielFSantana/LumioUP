import { describeMonthlyProgress } from '@lumioup/core';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, CategoryBadge, Chip, MenuRow, ProgressBar, Text } from '../../components/ui';
import { spacing, useTheme } from '../../theme';
import { useCategoryColor } from '../../theme/categoryColors';
import type { GoalView } from './hooks';
import { useGoalViews } from './hooks';
import { GOAL_COLORS, GOAL_ICONS } from './visuals';

/** Quantas metas aparecem no Início. */
const MAX_ON_HOME = 3;

const rank = (v: GoalView) => (v.deadline === 'overdue' ? 0 : v.deadline === 'soon' ? 1 : 2);

function Row({ view, onPress }: { view: GoalView; onPress: () => void }) {
  const { colors } = useTheme();
  const tint = useCategoryColor(GOAL_COLORS[view.goal.kind]);
  const alert = view.deadline === 'soon' || view.deadline === 'overdue';
  const barColor =
    view.monthlyProgress?.state === 'over'
      ? colors.expense
      : view.monthlyProgress?.state === 'near'
        ? colors.streak
        : tint;
  const detail = view.saving
    ? `${view.saving.percent}%`
    : view.monthlyProgress
      ? describeMonthlyProgress(view.goal.kind, view.monthlyProgress, view.goal.targetCents)
      : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${view.goal.name}. ${detail}${alert ? `. ${view.deadlineText}` : ''}`}
      onPress={onPress}
      style={styles.row}
    >
      <CategoryBadge
        icon={GOAL_ICONS[view.goal.kind]}
        color={GOAL_COLORS[view.goal.kind]}
        size={36}
      />
      <View style={styles.body}>
        <View style={styles.line}>
          <Text variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {view.goal.name}
          </Text>
          <Text variant="caption">{view.saving ? detail : ''}</Text>
        </View>
        <ProgressBar
          percent={view.barPercent}
          color={barColor}
          label={`Progresso de ${view.goal.name}`}
        />
        {view.monthlyProgress ? <Text variant="caption">{detail}</Text> : null}
        {alert ? (
          <Chip
            icon="time-outline"
            tone={view.deadline === 'overdue' ? 'danger' : 'streak'}
            label={view.deadlineText}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

/** Progresso das metas ativas no Início: as com prazo próximo ou vencido aparecem primeiro. */
export function GoalsSummary() {
  const router = useRouter();
  const { views, isLoading } = useGoalViews();
  const active = views.filter((v) => v.goal.status === 'active').sort((a, b) => rank(a) - rank(b));

  if (isLoading) return null;
  if (active.length === 0) {
    return (
      <MenuRow
        title="Metas"
        subtitle="Defina sua primeira meta"
        leading={<CategoryBadge icon="flag-outline" color="teal" />}
        onPress={() => router.push('/metas')}
      />
    );
  }
  return (
    <Card>
      <View style={styles.title}>
        <Text variant="heading">Metas</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/metas')}>
          <Text variant="caption" tone="text">
            Ver todas
          </Text>
        </Pressable>
      </View>
      {active.slice(0, MAX_ON_HOME).map((v) => (
        <Row
          key={v.goal.id}
          view={v}
          onPress={() => router.push({ pathname: '/meta', params: { id: v.goal.id } })}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  body: { flex: 1, gap: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
});
