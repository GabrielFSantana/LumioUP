import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Button, EmptyState, Screen, Text } from '../../src/components/ui';
import { GoalCard } from '../../src/features/goals/GoalCard';
import { useGoalViews, type GoalView } from '../../src/features/goals/hooks';
import { spacing, useTheme } from '../../src/theme';

/** Metas com prazo próximo ou vencido primeiro; depois por ordem de criação. */
function byUrgency(a: GoalView, b: GoalView): number {
  const rank = (v: GoalView) => (v.deadline === 'overdue' ? 0 : v.deadline === 'soon' ? 1 : 2);
  return rank(a) - rank(b);
}

export default function MetasScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [showClosed, setShowClosed] = useState(false);
  const { views, isLoading, isError, refetch } = useGoalViews();

  const active = views.filter((v) => v.goal.status === 'active').sort(byUrgency);
  const completed = views.filter((v) => v.goal.status === 'completed');
  const closed = views.filter((v) => v.goal.status === 'paused' || v.goal.status === 'cancelled');
  const open = (id: string) => router.push({ pathname: '/meta', params: { id } });

  return (
    <Screen title="Metas">
      <Button label="Nova meta" onPress={() => router.push('/meta/form')} />

      {isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
      {isError ? (
        <>
          <EmptyState title="Não deu para carregar" hint="Verifique sua conexão e tente de novo." />
          <Button label="Tentar de novo" variant="secondary" onPress={refetch} />
        </>
      ) : null}

      {!isLoading && !isError && views.length === 0 ? (
        <EmptyState
          title="Defina sua primeira meta"
          hint="Reserva de emergência, viagem, quitar uma dívida: comece pelo que importa para você."
        />
      ) : null}

      {active.map((v) => (
        <GoalCard key={v.goal.id} view={v} onPress={() => open(v.goal.id)} />
      ))}

      {completed.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <Text variant="heading">Concluídas</Text>
          {completed.map((v) => (
            <GoalCard key={v.goal.id} view={v} onPress={() => open(v.goal.id)} />
          ))}
        </View>
      ) : null}

      {closed.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Switch
              accessibilityLabel="Mostrar metas pausadas e canceladas"
              value={showClosed}
              onValueChange={setShowClosed}
              trackColor={{ true: colors.primaryEdge, false: colors.border }}
              thumbColor={showClosed ? colors.primary : colors.surface}
            />
            <Text variant="bodyBold">Mostrar pausadas e canceladas</Text>
          </View>
          {showClosed
            ? closed.map((v) => (
                <GoalCard key={v.goal.id} view={v} onPress={() => open(v.goal.id)} />
              ))
            : null}
        </View>
      ) : null}
    </Screen>
  );
}
