import { ACCOUNT_KIND_LABELS, formatBRL } from '@lumioup/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Button, CategoryBadge, EmptyState, MenuRow, Screen, Text } from '../../src/components/ui';
import { useAccounts } from '../../src/features/catalog/hooks';
import { useTheme } from '../../src/theme';

const ACCOUNT_ICONS = {
  wallet: 'wallet-outline',
  checking: 'business-outline',
  savings: 'cash-outline',
  investment: 'trending-up-outline',
  other: 'ellipsis-horizontal-outline',
} as const;

export default function ContasScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [showArchived, setShowArchived] = useState(false);
  const { data, isLoading, isError, refetch } = useAccounts();

  const items = (data ?? [])
    .filter((a) => showArchived || !a.isArchived)
    .sort((a, b) => Number(a.isArchived) - Number(b.isArchived));
  const hasArchived = (data ?? []).some((a) => a.isArchived);

  return (
    <Screen withHeader>
      {isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
      {isError ? (
        <EmptyState title="Não deu para carregar" hint="Verifique sua conexão e tente de novo." />
      ) : null}
      {isError ? (
        <Button label="Tentar de novo" variant="secondary" onPress={() => refetch()} />
      ) : null}

      {items.map((a) => (
        <MenuRow
          key={a.id}
          title={a.name}
          subtitle={a.isArchived ? 'Arquivada' : ACCOUNT_KIND_LABELS[a.kind]}
          trailing={formatBRL(a.openingBalanceCents)}
          muted={a.isArchived}
          leading={<CategoryBadge icon={ACCOUNT_ICONS[a.kind]} color="teal" />}
          onPress={() => router.push({ pathname: '/perfil/conta-form', params: { id: a.id } })}
        />
      ))}
      {data ? (
        <Text variant="caption">O valor mostrado é o saldo inicial de cada conta.</Text>
      ) : null}

      {hasArchived ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Switch
            accessibilityLabel="Mostrar contas arquivadas"
            value={showArchived}
            onValueChange={setShowArchived}
            trackColor={{ true: colors.primaryEdge, false: colors.border }}
            thumbColor={showArchived ? colors.primary : colors.surface}
          />
          <Text variant="bodyBold">Mostrar arquivadas</Text>
        </View>
      ) : null}

      <Button label="Nova conta" onPress={() => router.push('/perfil/conta-form')} />
    </Screen>
  );
}
