import { formatBRL } from '@lumioup/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
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
import { useTheme } from '../../src/theme';

const signed = (cents: number) => (cents > 0 ? `+ ${formatBRL(cents)}` : formatBRL(cents));

export default function InvestimentosScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [showArchived, setShowArchived] = useState(false);
  const { data: holdings, isLoading, isError, refetch } = useHoldings();
  const { data: categories } = useCategories();
  const { summaries, totals } = useInvestmentSummary();

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const items = (holdings ?? []).filter((h) => showArchived || !h.isArchived);
  const hasArchived = (holdings ?? []).some((h) => h.isArchived);
  const profitTone =
    totals.profitLoss > 0 ? 'incomeInk' : totals.profitLoss < 0 ? 'expenseInk' : 'text';

  return (
    <Screen withHeader>
      <Card>
        <Text variant="caption">Valor atual dos seus investimentos</Text>
        <Text variant="display" style={{ fontSize: 36, lineHeight: 42 }}>
          {formatBRL(totals.currentValue)}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text variant="caption">Aportado</Text>
            <Text variant="heading">{formatBRL(totals.contributed)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="caption">Lucro e perda</Text>
            <Text variant="heading" tone={profitTone}>
              {signed(totals.profitLoss)}
              {totals.returnPercent !== null ? ` (${totals.returnPercent}%)` : ''}
            </Text>
          </View>
        </View>
        <Text variant="caption">
          Valores informados por você. Conteúdo informativo, sem recomendação de investimento.
        </Text>
      </Card>

      {isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
      {isError ? (
        <>
          <EmptyState title="Não deu para carregar" hint="Verifique sua conexão e tente de novo." />
          <Button label="Tentar de novo" variant="secondary" onPress={() => refetch()} />
        </>
      ) : null}
      {!isLoading && !isError && items.length === 0 ? (
        <EmptyState
          title="Nenhuma posição ainda"
          hint="Crie uma posição, como Tesouro Selic ou uma ação, e registre seus aportes."
        />
      ) : null}

      {items.map((h) => {
        const category = categoryById.get(h.categoryId);
        const summary = summaries.get(h.id);
        return (
          <MenuRow
            key={h.id}
            title={h.name}
            subtitle={[
              h.isArchived ? 'Arquivada' : category?.name,
              summary?.returnPercent != null ? `${summary.returnPercent}%` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
            trailing={formatBRL(summary?.currentValue ?? 0)}
            muted={h.isArchived}
            leading={
              <CategoryBadge
                icon={category?.icon ?? 'pricetag-outline'}
                color={category?.color ?? 'blue'}
              />
            }
            onPress={() =>
              router.push({ pathname: '/investimentos/posicao', params: { id: h.id } })
            }
          />
        );
      })}

      {hasArchived ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Switch
            accessibilityLabel="Mostrar posições arquivadas"
            value={showArchived}
            onValueChange={setShowArchived}
            trackColor={{ true: colors.primaryEdge, false: colors.border }}
            thumbColor={showArchived ? colors.primary : colors.surface}
          />
          <Text variant="bodyBold">Mostrar arquivadas</Text>
        </View>
      ) : null}

      <Button label="Nova posição" onPress={() => router.push('/investimentos/posicao-form')} />
    </Screen>
  );
}
