import { formatBRL, summarize } from '@lumioup/core';
import { Text } from 'react-native';
import { Card, ProgressBar, Screen } from '../../src/components/ui';
import { useTheme } from '../../src/theme';

export default function InicioScreen() {
  const { colors } = useTheme();
  // Ainda não há lançamentos: os totais vêm do core com lista vazia (sem dados inventados).
  const summary = summarize([]);
  return (
    <Screen title="Início">
      <Card>
        <Text style={{ color: colors.textMuted }}>Saldo do período</Text>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800' }}>
          {formatBRL(summary.balance)}
        </Text>
        <Text style={{ color: colors.textMuted }}>
          Quando você registrar receitas e gastos, o resumo aparece aqui.
        </Text>
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Nível 1 · Curioso Financeiro</Text>
        <ProgressBar percent={0} label="Progresso de XP" />
        <Text style={{ color: colors.textMuted }}>
          Registre seu primeiro lançamento para ganhar XP.
        </Text>
      </Card>
    </Screen>
  );
}
