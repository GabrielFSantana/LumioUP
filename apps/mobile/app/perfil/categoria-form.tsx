import {
  CATEGORY_COLORS,
  CATEGORY_KIND_LABELS,
  isSameCatalogName,
  validateCatalogName,
  type CategoryColor,
  type CategoryKind,
} from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  CATEGORY_ICONS,
  Card,
  CategoryBadge,
  Chip,
  Screen,
  SegmentedControl,
  Text,
  TextField,
} from '../../src/components/ui';
import { friendlyCatalogError } from '../../src/features/catalog/api';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
} from '../../src/features/catalog/hooks';
import { radius, spacing, useTheme } from '../../src/theme';
import { useCategoryColor } from '../../src/theme/categoryColors';

const KIND_OPTIONS = (Object.keys(CATEGORY_KIND_LABELS) as CategoryKind[]).map((value) => ({
  value,
  label: CATEGORY_KIND_LABELS[value],
}));

function ColorDot({
  color,
  selected,
  onPress,
}: {
  color: CategoryColor;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const tint = useCategoryColor(color);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`Cor ${color}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.dot,
        { backgroundColor: tint, borderColor: selected ? colors.text : 'transparent' },
      ]}
    />
  );
}

export default function CategoriaFormScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const { data: categories } = useCategories();
  const existing = params.id ? categories?.find((c) => c.id === params.id) : undefined;
  const editing = Boolean(params.id);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>(
    KIND_OPTIONS.some((o) => o.value === params.kind) ? (params.kind as CategoryKind) : 'expense',
  );
  const [color, setColor] = useState<CategoryColor>('blue');
  const [icon, setIcon] = useState<string>('pricetag-outline');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Preenche o formulário quando a categoria carregar (modo edição).
  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name);
      setKind(existing.kind);
      setColor(existing.color);
      setIcon(existing.icon);
      setLoaded(true);
    }
  }, [existing, loaded]);

  const create = useCreateCategory();
  const update = useUpdateCategory();
  const busy = create.isPending || update.isPending;

  const save = async () => {
    setError(null);
    const nameError = validateCatalogName(name);
    if (nameError) return setError(nameError);
    const duplicate = (categories ?? []).some(
      (c) => c.kind === kind && c.id !== params.id && isSameCatalogName(c.name, name),
    );
    if (duplicate) return setError('Já existe uma categoria com esse nome.');
    try {
      if (editing && params.id) {
        await update.mutateAsync({ id: params.id, name, icon, color });
      } else {
        await create.mutateAsync({ kind, name, icon, color });
      }
      router.back();
    } catch (e) {
      setError(friendlyCatalogError(e));
    }
  };

  const toggleArchive = async () => {
    if (!existing) return;
    try {
      await update.mutateAsync({ id: existing.id, isArchived: !existing.isArchived });
      router.back();
    } catch (e) {
      setError(friendlyCatalogError(e));
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
      <Card>
        <View style={styles.preview}>
          <CategoryBadge icon={icon} color={color} size={56} />
          <Text variant="title" style={{ flexShrink: 1 }}>
            {name.trim() || 'Nova categoria'}
          </Text>
        </View>
      </Card>

      <TextField
        label="Nome"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        maxLength={40}
      />

      {editing ? (
        <Chip label={`Tipo: ${CATEGORY_KIND_LABELS[kind]}`} />
      ) : (
        <View style={{ gap: spacing.xs }}>
          <Text variant="caption">Tipo</Text>
          <SegmentedControl
            label="Tipo de categoria"
            options={KIND_OPTIONS}
            value={kind}
            onChange={setKind}
          />
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption">Cor</Text>
        <View accessibilityRole="radiogroup" style={styles.wrap}>
          {CATEGORY_COLORS.map((c) => (
            <ColorDot key={c} color={c} selected={c === color} onPress={() => setColor(c)} />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="caption">Ícone</Text>
        <View accessibilityRole="radiogroup" style={styles.wrap}>
          {CATEGORY_ICONS.map((name_) => (
            <Pressable
              key={name_}
              accessibilityRole="radio"
              accessibilityLabel={`Ícone ${name_.replace('-outline', '')}`}
              accessibilityState={{ selected: name_ === icon }}
              onPress={() => setIcon(name_)}
              style={[
                styles.iconCell,
                {
                  borderColor: name_ === icon ? colors.text : colors.border,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <CategoryBadge icon={name_} color={color} size={36} />
            </Pressable>
          ))}
        </View>
      </View>

      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Button label={busy ? 'Salvando…' : 'Salvar'} onPress={save} disabled={busy} />
      {editing && existing ? (
        <Button
          label={existing.isArchived ? 'Restaurar categoria' : 'Arquivar categoria'}
          variant="secondary"
          onPress={toggleArchive}
          disabled={busy}
        />
      ) : null}
      {editing && existing && !existing.isArchived ? (
        <Text variant="caption">
          Arquivar esconde a categoria das novas escolhas, mas mantém o histórico dos lançamentos.
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dot: { width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
