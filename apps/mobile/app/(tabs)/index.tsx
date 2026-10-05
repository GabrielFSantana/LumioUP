import { formatBRL, monthPeriod, summarize, toDateString } from '@lumioup/core';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Card,
  CategoryBadge,
  Chip,
  Mascot,
  MenuRow,
  ProgressBar,
  Screen,
  Text,
} from '../../src/components/ui';
import { WeekStrip } from '../../src/features/home/WeekStrip';
import { useInvestmentSummary } from '../../src/features/investments/hooks';
import { useTransactions } from '../../src/features/transactions/hooks';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { radius, spacing, useTheme } from '../../src/theme';

export default function InicioScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const name = String(session?.user.user_metadata?.display_name ?? '').trim();
  const period = monthPeriod(toDateString(new Date()));
  const { data: transactions } = useTransactions(period);
  const summary = summarize(transactions ?? []);
  const { totals } = useInvestmentSummary();

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

      <View style={[styles.hero, { backgroundColor: colors.heroBackground }]}>
        <Text variant="caption" style={{ color: colors.heroText, opacity: 0.8 }}>
          Saldo do mês
        </Text>
        <Text
          variant="display"
          style={{ color: colors.heroAccent, fontSize: 36, lineHeight: 42 }}
          accessibilityLabel={`Saldo do mês: ${formatBRL(summary.balance)}`}
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
        title="Investimentos"
        subtitle={
          totals.contributed > 0
            ? `Aportado ${formatBRL(totals.contributed)}${
                totals.returnPercent !== null ? ` · ${totals.returnPercent}%` : ''
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
});
