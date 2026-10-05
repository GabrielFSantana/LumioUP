import { CATEGORY_KIND_LABELS, type CategoryKind } from '@lumioup/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import {
  Button,
  CategoryBadge,
  EmptyState,
  MenuRow,
  Screen,
  SegmentedControl,
  Text,
} from '../../src/components/ui';
import { useCategories } from '../../src/features/catalog/hooks';
import { useTheme } from '../../src/theme';

const KIND_OPTIONS = (Object.keys(CATEGORY_KIND_LABELS) as CategoryKind[]).map((value) => ({
  value,
  label: CATEGORY_KIND_LABELS[value],
}));

export default function CategoriasScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [showArchived, setShowArchived] = useState(false);
  const { data, isLoading, isError, refetch } = useCategories();

  const items = (data ?? [])
    .filter((c) => c.kind === kind && (showArchived || !c.isArchived))
    .sort((a, b) => Number(a.isArchived) - Number(b.isArchived));
  const hasArchived = (data ?? []).some((c) => c.kind === kind && c.isArchived);

  return (
    <Screen withHeader>
      <SegmentedControl
        label="Tipo de categoria"
        options={KIND_OPTIONS}
        value={kind}
        onChange={setKind}
      />

      {isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
      {isError ? (
        <EmptyState title="Não deu para carregar" hint="Verifique sua conexão e tente de novo." />
      ) : null}
      {isError ? (
        <Button label="Tentar de novo" variant="secondary" onPress={() => refetch()} />
      ) : null}

      {items.map((c) => (
        <MenuRow
          key={c.id}
          title={c.name}
          subtitle={c.isArchived ? 'Arquivada' : undefined}
          muted={c.isArchived}
          leading={<CategoryBadge icon={c.icon} color={c.color} />}
          onPress={() => router.push({ pathname: '/perfil/categoria-form', params: { id: c.id } })}
        />
      ))}

      {hasArchived ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Switch
            accessibilityLabel="Mostrar categorias arquivadas"
            value={showArchived}
            onValueChange={setShowArchived}
            trackColor={{ true: colors.primaryEdge, false: colors.border }}
            thumbColor={showArchived ? colors.primary : colors.surface}
          />
          <Text variant="bodyBold">Mostrar arquivadas</Text>
        </View>
      ) : null}

      <Button
        label="Nova categoria"
        onPress={() => router.push({ pathname: '/perfil/categoria-form', params: { kind } })}
      />
    </Screen>
  );
}
