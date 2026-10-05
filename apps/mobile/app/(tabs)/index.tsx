import { formatBRL, summarize } from '@lumioup/core';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Mascot, ProgressBar, Screen, Text } from '../../src/components/ui';
import { WeekStrip } from '../../src/features/home/WeekStrip';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { radius, spacing, useTheme } from '../../src/theme';

export default function InicioScreen() {
  const { colors } = useTheme();
  const { session, signOut } = useAuth();
  const name = String(session?.user.user_metadata?.display_name ?? '').trim();
  // Ainda não há lançamentos: os totais vêm do core com lista vazia (sem dados inventados).
  const summary = summarize([]);

  return (
    <Screen>
      <View style={styles.header}>
        <Mascot size={56} />
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
          Saldo do período
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

      {/* Provisório: a tela de Perfil (etapa de perfil/configurações) assumirá o "Sair". */}
      <Card>
        <Text variant="caption">Conectado como {session?.user.email}</Text>
        <Button label="Sair" variant="secondary" onPress={signOut} />
      </Card>
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
