import { Ionicons } from '@expo/vector-icons';
import {
  buildReport,
  formatBRL,
  formatCompactBRL,
  formatMonthLabel,
  formatPercent,
  shiftMonth,
  toDateString,
  type AccountOpening,
  type ReportRange,
  type Transaction,
} from '@lumioup/core';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BarChart } from '../../src/components/charts/BarChart';
import { LineChart } from '../../src/components/charts/LineChart';
import { Card, EmptyState, Screen, SegmentedControl, Text } from '../../src/components/ui';
import { useAccounts, useCategories } from '../../src/features/catalog/hooks';
import { CategoryBars } from '../../src/features/dashboard/CategoryBars';
import { MetricTile } from '../../src/features/dashboard/MetricTile';
import { useAllTransactions } from '../../src/features/transactions/hooks';
import { minTouch, radius, spacing, useTheme } from '../../src/theme';

const RANGES = [
  { value: '6m', label: '6 meses' },
  { value: '12m', label: '12 meses' },
  { value: 'ytd', label: 'Ano' },
] as const;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const signed = (cents: number) => (cents > 0 ? `+ ${formatBRL(cents)}` : formatBRL(cents));

/** Texto neutro para variação: sem "bom" ou "ruim". */
function describeChange(percent: number | null): string {
  if (percent === null) return 'sem base de comparação';
  if (percent === 0) return 'estável';
  return `${percent > 0 ? 'aumentou' : 'diminuiu'} ${formatPercent(Math.abs(percent))}%`;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="caption">{label}</Text>
    </View>
  );
}

export default function RelatoriosScreen() {
  const { colors } = useTheme();
  const today = toDateString(new Date());
  const currentMonth = `${today.slice(0, 7)}-01`;

  const [range, setRange] = useState<ReportRange>('6m');
  const [endMonth, setEndMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<number | null>(null);

  const { data: transactions, isLoading } = useAllTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const categoryById = useMemo(
    () => new Map((categories ?? []).map((c) => [c.id, c])),
    [categories],
  );

  const report = useMemo(() => {
    const openings: AccountOpening[] = (accounts ?? []).map((a) => ({
      accountId: a.id,
      openingBalanceCents: a.openingBalanceCents,
    }));
    return buildReport({
      transactions: (transactions ?? []) as Transaction[],
      accounts: openings,
      endMonth,
      range,
      today,
    });
  }, [transactions, accounts, endMonth, range, today]);

  const series = report.series;
  const selectedIndex = Math.min(selected ?? series.length - 1, series.length - 1);
  const point = series[selectedIndex];
  const nextDisabled = shiftMonth(endMonth, 1) > currentMonth;
  const categoryName = (id: string | null) =>
    (id ? categoryById.get(id)?.name : undefined) ?? 'Sem categoria';

  const barSummary = `Receitas e gastos por mês. ${series
    .map((p) => `${p.label}: receitas ${formatBRL(p.income)}, gastos ${formatBRL(p.expense)}`)
    .join('; ')}.`;

  return (
    <Screen withHeader>
      <SegmentedControl
        label="Janela do relatório"
        options={RANGES}
        value={range}
        onChange={(next) => {
          setRange(next);
          setSelected(null);
        }}
      />

      <View style={styles.monthNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          onPress={() => {
            setEndMonth(shiftMonth(endMonth, -1));
            setSelected(null);
          }}
          style={styles.arrow}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="title" accessibilityRole="header">
          {capitalize(formatMonthLabel(endMonth))}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próximo mês"
          accessibilityState={{ disabled: nextDisabled }}
          disabled={nextDisabled}
          onPress={() => {
            setEndMonth(shiftMonth(endMonth, 1));
            setSelected(null);
          }}
          style={[styles.arrow, { opacity: nextDisabled ? 0.3 : 1 }]}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
      </View>

      {!isLoading && report.isEmpty ? (
        <EmptyState
          title="Sem lançamentos neste período"
          hint="Quando você registrar receitas e gastos, os relatórios aparecem aqui."
        />
      ) : (
        <>
          <Card>
            <Text variant="heading">Receitas e gastos por mês</Text>
            <View style={styles.legend}>
              <LegendDot color={colors.income} label="Receitas" />
              <LegendDot color={colors.expense} label="Gastos" />
            </View>
            <BarChart
              groups={series.map((p) => ({ label: p.label, values: [p.income, p.expense] }))}
              colors={[colors.income, colors.expense]}
              selectedIndex={selectedIndex}
              onSelect={setSelected}
              summary={barSummary}
            />
            {point ? (
              <View
                accessibilityLiveRegion="polite"
                style={[styles.readout, { backgroundColor: colors.primarySoft }]}
              >
                <Text variant="bodyBold">{capitalize(formatMonthLabel(point.month))}</Text>
                <Text variant="caption" tone="text">
                  {`Receitas ${formatBRL(point.income)} · Gastos ${formatBRL(point.expense)}`}
                </Text>
                <Text variant="caption" tone="text">
                  {`Investido ${formatBRL(point.invested)} · Lucro e perda ${signed(point.profitLoss)}`}
                </Text>
              </View>
            ) : null}
          </Card>

          <Card>
            <Text variant="heading">Comparação com o mês anterior</Text>
            {report.comparison.map((row) => (
              <View key={row.key} style={styles.compareRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold">{row.label}</Text>
                  <Text variant="caption">{describeChange(row.changePercent)}</Text>
                </View>
                <View style={styles.compareValues}>
                  <Text variant="bodyBold">{formatBRL(row.current)}</Text>
                  <Text variant="caption">{`antes ${formatBRL(row.previous)}`}</Text>
                </View>
              </View>
            ))}
          </Card>

          <Card>
            <Text variant="heading">Categorias que mais cresceram</Text>
            {report.increases.length === 0 && report.newExpenseCategories.length === 0 ? (
              <Text tone="textMuted">
                Nenhuma categoria de gasto cresceu em relação ao mês anterior.
              </Text>
            ) : null}
            {report.increases.map((c) => (
              <View key={c.categoryId ?? 'none'} style={styles.compareRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold">{categoryName(c.categoryId)}</Text>
                  <Text variant="caption">{`aumentou ${formatPercent(c.changePercent)}%`}</Text>
                </View>
                <Text variant="bodyBold">{`+ ${formatBRL(c.currentCents - c.previousCents)}`}</Text>
              </View>
            ))}
            {report.newExpenseCategories.length > 0 ? (
              <Text variant="caption">
                {`Novas neste mês: ${report.newExpenseCategories
                  .map((c) => categoryName(c.categoryId))
                  .join(', ')}.`}
              </Text>
            ) : null}
          </Card>

          {report.topExpenses.top.length > 0 ? (
            <Card>
              <Text variant="heading">Gastos por categoria</Text>
              <Text variant="caption">{`Soma da janela: ${formatBRL(report.windowTotals.expense)}`}</Text>
              <CategoryBars data={report.topExpenses} categoryById={categoryById} />
            </Card>
          ) : null}

          {report.topIncome.top.length > 0 ? (
            <Card>
              <Text variant="heading">Maiores fontes de receita</Text>
              <Text variant="caption">{`Soma da janela: ${formatBRL(report.windowTotals.income)}`}</Text>
              <CategoryBars data={report.topIncome} categoryById={categoryById} />
            </Card>
          ) : null}

          {series.length >= 2 ? (
            <Card>
              <Text variant="heading">Patrimônio no fim de cada mês</Text>
              <LineChart
                points={series.map((p) => ({ label: p.label, value: p.netWorth }))}
                valueFormatter={formatCompactBRL}
                summary={`Patrimônio mês a mês: ${series
                  .map((p) => `${p.label} ${formatBRL(p.netWorth)}`)
                  .join('; ')}.`}
              />
            </Card>
          ) : null}

          <Card>
            <Text variant="heading">Investimentos</Text>
            {series.length >= 2 ? (
              <LineChart
                points={series.map((p) => ({ label: p.label, value: p.investedValue }))}
                valueFormatter={formatCompactBRL}
                summary={`Valor investido mês a mês: ${series
                  .map((p) => `${p.label} ${formatBRL(p.investedValue)}`)
                  .join('; ')}.`}
              />
            ) : null}
            <View style={styles.tiles}>
              <MetricTile
                label="Aportes na janela"
                value={formatBRL(report.windowTotals.invested)}
                tone="investmentInk"
              />
              <MetricTile
                label="Lucro e perda"
                value={signed(report.windowTotals.profitLoss)}
                tone={
                  report.windowTotals.profitLoss > 0
                    ? 'incomeInk'
                    : report.windowTotals.profitLoss < 0
                      ? 'expenseInk'
                      : 'text'
                }
              />
              <MetricTile
                label="Da renda investida"
                value={
                  report.windowTotals.income > 0
                    ? `${formatPercent(report.windowTotals.investedPercent)}%`
                    : '-'
                }
              />
            </View>
            <Text variant="caption">
              Valores informados por você. Conteúdo informativo, sem recomendação de investimento.
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  readout: { padding: spacing.sm + 4, borderRadius: radius.md, gap: 2 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compareValues: { alignItems: 'flex-end' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
