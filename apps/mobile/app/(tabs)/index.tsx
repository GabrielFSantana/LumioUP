import { Ionicons } from '@expo/vector-icons';
import {
  buildDashboard,
  formatBRL,
  formatPercent,
  toDateString,
  type AccountOpening,
  type Transaction,
} from '@lumioup/core';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Card,
  CategoryBadge,
  Chip,
  EmptyState,
  Mascot,
  MenuRow,
  ProgressBar,
  Screen,
  Text,
} from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { useAccounts, useCategories } from '../../src/features/catalog/hooks';
import { CategoryBars } from '../../src/features/dashboard/CategoryBars';
import { MetricTile } from '../../src/features/dashboard/MetricTile';
import { NetWorthChart } from '../../src/features/dashboard/NetWorthChart';
import { PeriodSelector, type PeriodState } from '../../src/features/dashboard/PeriodSelector';
import { WeekStrip } from '../../src/features/home/WeekStrip';
import { useInvestmentSummary } from '../../src/features/investments/hooks';
import { useAllTransactions } from '../../src/features/transactions/hooks';
import { radius, spacing, useTheme } from '../../src/theme';

const signed = (cents: number) => (cents > 0 ? `+ ${formatBRL(cents)}` : formatBRL(cents));

export default function InicioScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const name = String(session?.user.user_metadata?.display_name ?? '').trim();
  const today = toDateString(new Date());

  const [period, setPeriod] = useState<PeriodState>({ kind: 'month', anchor: today, custom: null });
  const { data: transactions, isLoading } = useAllTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { totals } = useInvestmentSummary();

  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  const dashboard = useMemo(() => {
    const openings: AccountOpening[] = (accounts ?? []).map((a) => ({
      accountId: a.id,
      openingBalanceCents: a.openingBalanceCents,
    }));
    return buildDashboard({
      kind: period.kind,
      anchor: period.anchor,
      custom: period.custom ?? undefined,
      today,
      transactions: (transactions ?? []) as Transaction[],
      accounts: openings,
      categoryName: (id) => (id ? categoryById.get(id)?.name : undefined),
    });
  }, [period, transactions, accounts, categoryById, today]);

  const { summary } = dashboard;
  const worth = dashboard.netWorthNow;
  const change = dashboard.netWorthChangeCents;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Abrir perfil"
          onPress={() => router.push('/perfil')}
        >
          <Mascot size={56} />
        </Pressable>
        <View style={styles.headerText}>
          <Text variant="title">{name ? `Oi, ${name}!` : 'Oi!'}</Text>
          <Text variant="caption">Sua luz de hoje está acesa?</Text>
        </View>
      </View>

      <View style={styles.chips}>
        <Chip icon="flame-outline" tone="streak" label="0 dias" />
        <Chip label="Nível 1 · Curioso Financeiro" />
      </View>

      <WeekStrip activeDays={[]} />

      <PeriodSelector state={period} onChange={setPeriod} />

      <View style={[styles.hero, { backgroundColor: colors.heroBackground }]}>
        <Text variant="caption" style={{ color: colors.heroText, opacity: 0.8 }}>
          {`Saldo · ${dashboard.label}`}
        </Text>
        <Text
          variant="display"
          style={{ color: colors.heroAccent, fontSize: 36, lineHeight: 42 }}
          accessibilityLabel={`Saldo do período: ${formatBRL(summary.balance)}`}
        >
          {formatBRL(summary.balance)}
        </Text>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: colors.incomeSoft }]}>
            <Text variant="caption" tone="incomeInk">
              {`+ ${formatBRL(summary.income)} receitas`}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: colors.expenseSoft }]}>
            <Text variant="caption" tone="expenseInk">
              {`- ${formatBRL(summary.expense)} gastos`}
            </Text>
          </View>
        </View>
      </View>

      {dashboard.insights.length > 0 ? (
        <Card>
          {dashboard.insights.map((sentence) => (
            <View key={sentence} style={styles.insight}>
              <Ionicons name="bulb-outline" size={20} color={colors.primaryEdge} />
              <Text style={{ flex: 1 }}>{sentence}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.tiles}>
        <MetricTile label="Investido" value={formatBRL(summary.invested)} tone="investment" />
        <MetricTile
          label="Lucro e perda"
          value={signed(summary.profitLoss)}
          tone={
            summary.profitLoss > 0 ? 'incomeInk' : summary.profitLoss < 0 ? 'expenseInk' : 'text'
          }
        />
        <MetricTile
          label="Da renda investida"
          value={summary.income > 0 ? `${formatPercent(summary.investedPercent)}%` : '-'}
        />
        <MetricTile label="Resgates" value={formatBRL(summary.redeemed)} />
      </View>

      {!isLoading && dashboard.isEmpty ? (
        <EmptyState
          title="Sem lançamentos neste período"
          hint="Quando você registrar receitas e gastos, os gráficos e comparações aparecem aqui."
        />
      ) : null}

      {dashboard.topExpenses.top.length > 0 ? (
        <Card>
          <Text variant="heading">Para onde foi seu dinheiro</Text>
          <CategoryBars data={dashboard.topExpenses} categoryById={categoryById} />
        </Card>
      ) : null}

      {dashboard.topIncome.top.length > 0 ? (
        <Card>
          <Text variant="heading">De onde veio</Text>
          <CategoryBars data={dashboard.topIncome} categoryById={categoryById} />
        </Card>
      ) : null}

      <Card>
        <Text variant="heading">Patrimônio</Text>
        <Text variant="display" style={{ fontSize: 30, lineHeight: 36 }}>
          {formatBRL(worth.total)}
        </Text>
        <Text variant="caption">
          {`Em caixa ${formatBRL(worth.cash)} · Investido ${formatBRL(worth.invested)}`}
        </Text>
        {change !== null ? (
          <Text
            variant="caption"
            tone={change > 0 ? 'incomeInk' : change < 0 ? 'expenseInk' : 'textMuted'}
          >
            {change === 0 ? 'Sem variação neste período' : `${signed(change)} neste período`}
          </Text>
        ) : null}
        <NetWorthChart points={dashboard.netWorthSeries} />
      </Card>

      <Card>
        <View style={styles.rowBetween}>
          <Text variant="heading">Missão do dia</Text>
          <View style={[styles.pill, { backgroundColor: colors.primarySoft }]}>
            <Text variant="caption" tone="text">
              +10 XP
            </Text>
          </View>
        </View>
        <Text variant="caption">Registre seu primeiro lançamento</Text>
        <ProgressBar percent={0} label="Progresso da missão do dia" />
      </Card>

      <MenuRow
        title="Relatórios"
        subtitle="Meses lado a lado, categorias e evolução"
        leading={<CategoryBadge icon="bar-chart-outline" color="teal" />}
        onPress={() => router.push('/relatorios')}
      />

      <MenuRow
        title="Investimentos"
        subtitle={
          totals.contributed > 0
            ? `Aportado ${formatBRL(totals.contributed)}${
                totals.returnPercent !== null ? ` · ${formatPercent(totals.returnPercent)}%` : ''
              }`
            : 'Crie uma posição e registre seus aportes'
        }
        trailing={formatBRL(totals.currentValue)}
        leading={<CategoryBadge icon="trending-up-outline" color="blue" />}
        onPress={() => router.push('/investimentos')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  headerText: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hero: {
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
    borderBottomWidth: 5,
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  insight: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
