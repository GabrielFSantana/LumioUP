import { Ionicons } from '@expo/vector-icons';
import {
  INVESTMENT_KIND_LABELS,
  displaySign,
  formatBRL,
  formatDayLabel,
  formatMonthLabel,
  groupByDay,
  isInvestmentKind,
  matchesFilter,
  monthPeriod,
  shiftMonth,
  summarize,
  toDateString,
  type InvestmentKind,
  type TransactionFilter,
} from '@lumioup/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  CategoryBadge,
  EmptyState,
  MenuRow,
  Screen,
  SegmentedControl,
  Text,
} from '../../src/components/ui';
import { useAccounts, useCategories } from '../../src/features/catalog/hooks';
import { useHoldings } from '../../src/features/investments/hooks';
import { useTransactions } from '../../src/features/transactions/hooks';
import { minTouch, spacing, useTheme } from '../../src/theme';

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'expense', label: 'Gastos' },
  { value: 'income', label: 'Receitas' },
  { value: 'transfer', label: 'Transf.' },
  { value: 'investing', label: 'Invest.' },
] as const;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function MonthNav({
  label,
  onPrev,
  onNext,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.monthNav}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
        onPress={onPrev}
        style={styles.navButton}
      >
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Text variant="title" accessibilityRole="header">
        {capitalize(label)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Próximo mês"
        onPress={onNext}
        style={styles.navButton}
      >
        <Ionicons name="chevron-forward" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

export default function LancamentosScreen() {
  const router = useRouter();
  const today = toDateString(new Date());
  const [monthStart, setMonthStart] = useState(monthPeriod(today).from);
  const [filter, setFilter] = useState<TransactionFilter>('all');

  const period = useMemo(() => monthPeriod(monthStart), [monthStart]);
  const { data, isLoading, isError, refetch } = useTransactions(period);
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: holdings } = useHoldings();

  const accountName = useMemo(
    () => new Map((accounts ?? []).map((a) => [a.id, a.name])),
    [accounts],
  );
  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  const holdingNameById = useMemo(
    () => new Map((holdings ?? []).map((h) => [h.id, h.name])),
    [holdings],
  );

  const all = data ?? [];
  const summary = summarize(all);
  const groups = groupByDay(all.filter((t) => matchesFilter(t, filter)));

  return (
    <Screen>
      <Text accessibilityRole="header" variant="display">
        Lançamentos
      </Text>

      <Button label="Novo lançamento" onPress={() => router.push('/lancamento-form')} />

      <MonthNav
        label={formatMonthLabel(monthStart)}
        onPrev={() => setMonthStart(shiftMonth(monthStart, -1))}
        onNext={() => setMonthStart(shiftMonth(monthStart, 1))}
      />

      <Card>
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text variant="caption">Receitas</Text>
            <Text variant="heading" tone="incomeInk">
              {formatBRL(summary.income)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="caption">Gastos</Text>
            <Text variant="heading" tone="expenseInk">
              {formatBRL(summary.expense)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant="caption">Saldo</Text>
            <Text variant="heading">{formatBRL(summary.balance)}</Text>
          </View>
        </View>
      </Card>

      <SegmentedControl
        label="Filtrar lançamentos"
        scrollable
        options={FILTERS}
        value={filter}
        onChange={setFilter}
      />

      {isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
      {isError ? (
        <>
          <EmptyState title="Não deu para carregar" hint="Verifique sua conexão e tente de novo." />
          <Button label="Tentar de novo" variant="secondary" onPress={() => refetch()} />
        </>
      ) : null}

      {!isLoading && !isError && groups.length === 0 ? (
        <EmptyState
          title={all.length === 0 ? 'Nenhum lançamento neste mês' : 'Nada com esse filtro'}
          hint={
            all.length === 0
              ? 'Registre uma receita ou um gasto. Leva poucos segundos.'
              : 'Troque o filtro para ver os outros lançamentos.'
          }
        />
      ) : null}

      {groups.map((group) => (
        <View key={group.date} style={{ gap: spacing.sm }}>
          <Text variant="caption">{capitalize(formatDayLabel(group.date, today))}</Text>
          {group.items.map((t) => {
            const category = t.categoryId ? categoryById.get(t.categoryId) : undefined;
            const sign = displaySign(t.kind);
            const isTransfer = t.kind === 'transfer';
            const investing = isInvestmentKind(t.kind);
            const movesCash = t.kind !== 'profit' && t.kind !== 'loss';
            const holdingName = t.holdingId ? holdingNameById.get(t.holdingId) : undefined;
            const account = t.accountId ? accountName.get(t.accountId) : undefined;
            const amount = formatBRL(t.amountCents);
            const title = investing
              ? t.description || holdingName || 'Investimento'
              : t.description || category?.name || 'Transferência';
            return (
              <MenuRow
                key={t.id}
                title={title}
                subtitle={
                  isTransfer
                    ? `${account ?? ''} → ${accountName.get(t.toAccountId ?? '') ?? ''}`
                    : investing
                      ? [
                          INVESTMENT_KIND_LABELS[t.kind as InvestmentKind],
                          holdingName,
                          account,
                          movesCash ? null : 'não move o caixa',
                        ]
                          .filter((part) => part && part !== title)
                          .join(' · ')
                      : [category?.name, account]
                          .filter((part) => part && part !== title)
                          .join(' · ')
                }
                leading={
                  <CategoryBadge
                    icon={
                      isTransfer
                        ? 'swap-horizontal-outline'
                        : (category?.icon ?? 'pricetag-outline')
                    }
                    color={isTransfer ? 'slate' : (category?.color ?? 'slate')}
                  />
                }
                trailing={sign === 1 ? `+ ${amount}` : sign === -1 ? `- ${amount}` : amount}
                trailingTone={
                  !movesCash
                    ? 'investmentInk'
                    : sign === 1
                      ? 'incomeInk'
                      : sign === -1
                        ? 'expenseInk'
                        : 'textMuted'
                }
                onPress={() => router.push({ pathname: '/lancamento-form', params: { id: t.id } })}
              />
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  summaryItem: { flex: 1 },
});
