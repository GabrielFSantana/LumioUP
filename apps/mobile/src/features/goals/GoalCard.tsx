import {
  GOAL_KIND_LABELS,
  describeMonthlyProgress,
  formatBRL,
  type GoalStatus,
} from '@lumioup/core';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, CategoryBadge, Chip, ProgressBar, Text } from '../../components/ui';
import { spacing, useTheme } from '../../theme';
import { useCategoryColor } from '../../theme/categoryColors';
import type { GoalView } from './hooks';
import { GOAL_COLORS, GOAL_ICONS } from './visuals';

const STATUS_LABELS: Partial<Record<GoalStatus, string>> = {
  completed: 'Concluída',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

/** Cor da barra: verde ao concluir, coral ao passar do limite, âmbar perto do limite. */
function useBarColor(view: GoalView): string {
  const { colors } = useTheme();
  const base = useCategoryColor(GOAL_COLORS[view.goal.kind]);
  if (view.saving?.reached) return colors.income;
  if (view.monthlyProgress?.state === 'over') return colors.expense;
  if (view.monthlyProgress?.state === 'near') return colors.streak;
  if (view.monthlyProgress?.state === 'done') return colors.income;
  return base;
}

interface GoalCardProps {
  view: GoalView;
  onPress: () => void;
}

export function GoalCard({ view, onPress }: GoalCardProps) {
  const { goal, saving, monthlyProgress } = view;
  const barColor = useBarColor(view);
  const statusLabel = STATUS_LABELS[goal.status];
  const alertTone = view.deadline === 'overdue' ? 'danger' : 'streak';

  const detail = saving
    ? `${formatBRL(saving.currentCents)} de ${formatBRL(goal.targetCents)} · ${saving.percent}%`
    : monthlyProgress
      ? describeMonthlyProgress(goal.kind, monthlyProgress, goal.targetCents)
      : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}. ${detail}${view.deadlineText ? `. ${view.deadlineText}` : ''}`}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ translateY: pressed ? 2 : 0 }] })}
    >
      <Card>
        <View style={styles.header}>
          <CategoryBadge icon={GOAL_ICONS[goal.kind]} color={GOAL_COLORS[goal.kind]} size={44} />
          <View style={styles.title}>
            <Text variant="heading" numberOfLines={1}>
              {goal.name}
            </Text>
            <Text variant="caption">{GOAL_KIND_LABELS[goal.kind]}</Text>
          </View>
        </View>
        <ProgressBar
          percent={view.barPercent}
          color={barColor}
          label={`Progresso de ${goal.name}`}
        />
        <Text variant="caption" tone="text">
          {detail}
        </Text>
        <View style={styles.chips}>
          {statusLabel ? <Chip label={statusLabel} /> : null}
          {!view.monthly && !statusLabel && view.deadline !== 'none' ? (
            <Chip
              icon={view.deadline === 'done' ? 'checkmark-circle-outline' : 'time-outline'}
              tone={
                view.deadline === 'soon' || view.deadline === 'overdue' ? alertTone : 'textMuted'
              }
              label={view.deadlineText}
            />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  title: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
