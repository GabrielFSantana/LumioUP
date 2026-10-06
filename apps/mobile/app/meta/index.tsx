import { Ionicons } from '@expo/vector-icons';
import {
  GOAL_KIND_LABELS,
  describeMonthlyProgress,
  formatBRL,
  formatBrDate,
  type GoalStatus,
} from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  CategoryBadge,
  Chip,
  EmptyState,
  Mascot,
  ProgressBar,
  Screen,
  Text,
  useToast,
} from '../../src/components/ui';
import { friendlyGoalError } from '../../src/features/goals/api';
import {
  useGoalViews,
  useSetContributionDeleted,
  useUpdateGoal,
} from '../../src/features/goals/hooks';
import { GOAL_COLORS, GOAL_ICONS } from '../../src/features/goals/visuals';
import { minTouch, radius, spacing, useTheme } from '../../src/theme';
import { useCategoryColor } from '../../src/theme/categoryColors';

const STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Ativa',
  completed: 'Concluída',
  paused: 'Pausada',
  cancelled: 'Cancelada',
};

export default function MetaScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const { views } = useGoalViews();
  const view = views.find((v) => v.goal.id === params.id);
  const update = useUpdateGoal();
  const remove = useSetContributionDeleted();
  const tint = useCategoryColor(view ? GOAL_COLORS[view.goal.kind] : 'slate');

  if (!view) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }

  const { goal, saving, monthlyProgress } = view;
  const canContribute = !view.monthly && (goal.status === 'active' || goal.status === 'completed');
  const barColor = saving?.reached
    ? colors.income
    : monthlyProgress?.state === 'over'
      ? colors.expense
      : monthlyProgress?.state === 'near'
        ? colors.streak
        : tint;

  const setStatus = async (status: GoalStatus, undoTo?: GoalStatus) => {
    try {
      await update.mutateAsync({ id: goal.id, status });
      if (undoTo) {
        toast.show({
          message: status === 'cancelled' ? 'Meta cancelada' : 'Meta atualizada',
          actionLabel: 'Desfazer',
          onAction: () => update.mutate({ id: goal.id, status: undoTo }),
        });
      }
    } catch (e) {
      toast.show({ message: friendlyGoalError(e) });
    }
  };

  const deleteContribution = async (id: string) => {
    try {
      await remove.mutateAsync({ id, deleted: true });
      toast.show({
        message: 'Contribuição excluída',
        actionLabel: 'Desfazer',
        onAction: () => remove.mutate({ id, deleted: false }),
      });
    } catch (e) {
      toast.show({ message: friendlyGoalError(e) });
    }
  };

  return (
    <Screen withHeader>
      <Card>
        <View style={styles.header}>
          <CategoryBadge icon={GOAL_ICONS[goal.kind]} color={GOAL_COLORS[goal.kind]} size={48} />
          <View style={{ flex: 1 }}>
            <Text variant="title">{goal.name}</Text>
            <Text variant="caption">{GOAL_KIND_LABELS[goal.kind]}</Text>
          </View>
          <Chip label={STATUS_LABELS[goal.status]} />
        </View>

        {saving ? (
          <>
            <Text variant="display" style={{ fontSize: 34, lineHeight: 40 }}>
              {formatBRL(saving.currentCents)}
            </Text>
            <Text variant="caption">{`de ${formatBRL(goal.targetCents)} · ${saving.percent}%`}</Text>
          </>
        ) : monthlyProgress ? (
          <>
            <Text variant="display" style={{ fontSize: 34, lineHeight: 40 }}>
              {formatBRL(monthlyProgress.valueCents)}
            </Text>
            <Text variant="caption">{`de ${formatBRL(goal.targetCents)} neste mês · ${monthlyProgress.percent}%`}</Text>
          </>
        ) : null}

        <ProgressBar
          percent={view.barPercent}
          color={barColor}
          label={`Progresso de ${goal.name}`}
        />

        {monthlyProgress ? (
          <Text>{describeMonthlyProgress(goal.kind, monthlyProgress, goal.targetCents)}</Text>
        ) : null}

        {!view.monthly && view.deadline !== 'none' ? (
          <Chip
            icon={view.deadline === 'done' ? 'checkmark-circle-outline' : 'time-outline'}
            tone={
              view.deadline === 'overdue'
                ? 'danger'
                : view.deadline === 'soon'
                  ? 'streakInk'
                  : 'textMuted'
            }
            label={
              goal.deadline && view.deadline !== 'done'
                ? `${view.deadlineText} · ${formatBrDate(goal.deadline)}`
                : view.deadlineText
            }
          />
        ) : null}

        {view.monthlyNeededCents !== null ? (
          <Text variant="caption" tone="text">
            {`Para chegar lá no prazo, guarde cerca de ${formatBRL(view.monthlyNeededCents)} por mês.`}
          </Text>
        ) : null}
      </Card>

      {saving?.reached ? (
        <Card highlight>
          <View style={styles.celebrate}>
            <Mascot size={72} mood="cheer" />
            <View style={{ flex: 1 }}>
              <Text variant="heading">Meta atingida!</Text>
              <Text variant="caption" tone="text">
                Você chegou ao valor que definiu. Dá para continuar guardando se quiser.
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      {canContribute ? (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button
              label="Guardar"
              onPress={() =>
                router.push({ pathname: '/meta/contribuicao', params: { goalId: goal.id } })
              }
            />
          </View>
          <View style={styles.action}>
            <Button
              label="Retirar"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/meta/contribuicao',
                  params: { goalId: goal.id, mode: 'withdraw' },
                })
              }
            />
          </View>
        </View>
      ) : null}

      {!view.monthly ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="heading">Histórico</Text>
          {view.contributions.length === 0 ? (
            <EmptyState
              title="Nada guardado ainda"
              hint="Registre a primeira contribuição para começar a acompanhar o progresso."
            />
          ) : null}
          {view.contributions.map((c) => (
            <View
              key={c.id}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text variant="bodyBold">{formatBrDate(c.occurredOn)}</Text>
                {c.note ? <Text variant="caption">{c.note}</Text> : null}
              </View>
              <Text variant="bodyBold" tone={c.amountCents > 0 ? 'incomeInk' : 'expenseInk'}>
                {c.amountCents > 0
                  ? `+ ${formatBRL(c.amountCents)}`
                  : `- ${formatBRL(-c.amountCents)}`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Excluir contribuição de ${formatBrDate(c.occurredOn)}`}
                onPress={() => deleteContribution(c.id)}
                style={styles.trash}
              >
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Button
          label="Editar meta"
          variant="secondary"
          onPress={() => router.push({ pathname: '/meta/form', params: { id: goal.id } })}
        />
        {goal.status === 'active' || goal.status === 'completed' ? (
          <Button label="Pausar meta" variant="secondary" onPress={() => setStatus('paused')} />
        ) : null}
        {goal.status === 'paused' ? (
          <Button label="Retomar meta" variant="secondary" onPress={() => setStatus('active')} />
        ) : null}
        {goal.status === 'cancelled' ? (
          <Button label="Reativar meta" variant="secondary" onPress={() => setStatus('active')} />
        ) : (
          <Button
            label="Cancelar meta"
            variant="secondary"
            onPress={() => setStatus('cancelled', goal.status)}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  celebrate: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    minHeight: minTouch + 8,
  },
  trash: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
});
