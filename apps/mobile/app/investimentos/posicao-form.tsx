import { isSameCatalogName, validateCatalogName } from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Chip, Screen, Text, TextField } from '../../src/components/ui';
import { useCategories } from '../../src/features/catalog/hooks';
import { friendlyHoldingError } from '../../src/features/investments/api';
import {
  useCreateHolding,
  useHoldings,
  useUpdateHolding,
} from '../../src/features/investments/hooks';
import { CategoryPicker } from '../../src/features/transactions/CategoryPicker';
import { spacing } from '../../src/theme';

export default function PosicaoFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(params.id);
  const { data: holdings } = useHoldings();
  const { data: categories } = useCategories();
  const existing = params.id ? holdings?.find((h) => h.id === params.id) : undefined;

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name);
      setCategoryId(existing.categoryId);
      setLoaded(true);
    }
  }, [existing, loaded]);

  const create = useCreateHolding();
  const update = useUpdateHolding();
  const busy = create.isPending || update.isPending;

  const investmentCategories = (categories ?? []).filter(
    (c) => c.kind === 'investment' && !c.isArchived,
  );
  const currentCategory = (categories ?? []).find((c) => c.id === categoryId);

  const save = async () => {
    setError(null);
    const nameError = validateCatalogName(name);
    if (nameError) return setError(nameError);
    if (!categoryId) return setError('Escolha a categoria da posição.');
    const duplicate = (holdings ?? []).some(
      (h) => h.id !== params.id && isSameCatalogName(h.name, name),
    );
    if (duplicate) return setError('Já existe uma posição com esse nome.');
    try {
      if (editing && params.id) await update.mutateAsync({ id: params.id, name });
      else await create.mutateAsync({ name, categoryId });
      router.back();
    } catch (e) {
      setError(friendlyHoldingError(e));
    }
  };

  const toggleArchive = async () => {
    if (!existing) return;
    try {
      await update.mutateAsync({ id: existing.id, isArchived: !existing.isArchived });
      router.back();
    } catch (e) {
      setError(friendlyHoldingError(e));
    }
  };

  if (editing && !existing) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }

  return (
    <Screen withHeader>
      <TextField
        label="Nome da posição"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        maxLength={60}
        placeholder="Ex.: Tesouro Selic"
      />

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption">Categoria</Text>
        {editing ? (
          <>
            <Chip label={currentCategory?.name ?? 'Investimento'} />
            <Text variant="caption">A categoria não muda depois que a posição é criada.</Text>
          </>
        ) : investmentCategories.length > 0 ? (
          <CategoryPicker
            categories={investmentCategories}
            selectedId={categoryId}
            onSelect={setCategoryId}
          />
        ) : (
          <Text tone="textMuted">
            Nenhuma categoria de investimento ativa. Crie uma em Perfil, Categorias.
          </Text>
        )}
      </View>

      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Button label={busy ? 'Salvando…' : 'Salvar'} onPress={save} disabled={busy} />
      {editing && existing ? (
        <Button
          label={existing.isArchived ? 'Restaurar posição' : 'Arquivar posição'}
          variant="secondary"
          onPress={toggleArchive}
          disabled={busy}
        />
      ) : null}
    </Screen>
  );
}
