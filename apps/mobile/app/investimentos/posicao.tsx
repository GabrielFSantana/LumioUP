import {
  INVESTMENT_KIND_LABELS,
  positionEffect,
  formatBRL,
  formatBrDate,
  type InvestmentKind,
} from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  CategoryBadge,
  EmptyState,
  MenuRow,
  Screen,
  Text,
} from '../../src/components/ui';
import { useCategories } from '../../src/features/catalog/hooks';
import { useHoldings, useInvestmentSummary } from '../../src/features/investments/hooks';
import { spacing } from '../../src/theme';

const KINDS = Object.keys(INVESTMENT_KIND_LABELS) as InvestmentKind[];

export default function PosicaoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { data: holdings } = useHoldings();
  const { data: categories } = useCategories();
  const { data: moves, summaries } = useInvestmentSummary();

  const holding = holdings?.find((h) => h.id === params.id);
  if (!holding) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }
  const category = categories?.find((c) => c.id === holding.categoryId);
  const summary = summaries.get(holding.id);
  const history = (moves ?? []).filter((t) => t.holdingId === holding.id);
  const profitTone =
    (summary?.profitLoss ?? 0) > 0
      ? 'incomeInk'
      : (summary?.profitLoss ?? 0) < 0
        ? 'expenseInk'
        : 'text';

  const register = (kind: InvestmentKind) =>
    router.push({ pathname: '/lancamento-form', params: { kind, holdingId: holding.id } });

  return (
    <Screen withHeader>
      <Card>
        <View style={styles.title}>
          <CategoryBadge
            icon={category?.icon ?? 'pricetag-outline'}
            color={category?.color ?? 'blue'}
            size={48}
          />
          <View style={{ flex: 1 }}>
            <Text variant="title">{holding.name}</Text>
            <Text variant="caption">
              {holding.isArchived ? 'Arquivada' : (category?.name ?? 'Investimento')}
            </Text>
          </View>
        </View>
        <Text variant="caption">Valor atual</Text>
        <Text variant="display" style={{ fontSize: 36, lineHeight: 42 }}>
          {formatBRL(summary?.currentValue ?? 0)}
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text variant="caption">Aportado</Text>
            <Text variant="heading">{formatBRL(summary?.contributed ?? 0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption">Lucro e perda</Text>
            <Text variant="heading" tone={profitTone}>
              {formatBRL(summary?.profitLoss ?? 0)}
              {summary?.returnPercent != null ? ` (${summary.returnPercent}%)` : ''}
            </Text>
          </View>
        </View>
      </Card>

      {holding.isArchived ? null : (
        <View style={styles.actions}>
          {KINDS.map((kind) => (
            <View key={kind} style={styles.action}>
              <Button
                label={INVESTMENT_KIND_LABELS[kind]}
                variant={kind === 'investment' ? 'primary' : 'secondary'}
                onPress={() => register(kind)}
              />
            </View>
          ))}
        </View>
      )}

      <Text variant="heading">Histórico</Text>
      {history.length === 0 ? (
        <EmptyState
          title="Sem movimentos ainda"
          hint="Registre o primeiro aporte para começar a acompanhar esta posição."
        />
      ) : null}
      {history.map((t) => {
        const sign = positionEffect(t.kind);
        const amount = formatBRL(t.amountCents);
        return (
          <MenuRow
            key={t.id}
            title={INVESTMENT_KIND_LABELS[t.kind as InvestmentKind]}
            subtitle={[formatBrDate(t.occurredOn), t.description].filter(Boolean).join(' · ')}
            trailing={sign === 1 ? `+ ${amount}` : `- ${amount}`}
            trailingTone={sign === 1 ? 'incomeInk' : 'expenseInk'}
            onPress={() => router.push({ pathname: '/lancamento-form', params: { id: t.id } })}
          />
        );
      })}

      <Button
        label="Editar posição"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/investimentos/posicao-form', params: { id: holding.id } })
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexBasis: '47%', flexGrow: 1 },
});
