import { Pressable, StyleSheet, View } from 'react-native';
import { CategoryBadge, Text } from '../../components/ui';
import { edge, radius, spacing, useTheme } from '../../theme';
import type { Category } from '../catalog/api';

interface CategoryPickerProps {
  categories: readonly Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Grade de categorias (3 por linha), como no mockup do lançamento rápido. */
export function CategoryPicker({ categories, selectedId, onSelect }: CategoryPickerProps) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Categoria" style={styles.grid}>
      {categories.map((c) => {
        const selected = c.id === selectedId;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="radio"
            accessibilityLabel={c.name}
            accessibilityState={{ selected }}
            onPress={() => onSelect(c.id)}
            style={[
              styles.tile,
              {
                backgroundColor: colors.surface,
                borderColor: selected ? colors.text : colors.border,
                borderBottomWidth: selected ? edge - 1 : 2,
              },
            ]}
          >
            <CategoryBadge icon={c.icon} color={c.color} size={36} />
            <Text variant="caption" tone="text" numberOfLines={1} style={styles.label}>
              {c.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31.8%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 2,
  },
  label: { textAlign: 'center', maxWidth: '100%' },
});
