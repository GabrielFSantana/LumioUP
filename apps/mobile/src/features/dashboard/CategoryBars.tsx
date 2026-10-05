import { formatBRL, type CategoryTotal, type TopCategories } from '@lumioup/core';
import { StyleSheet, View } from 'react-native';
import { CategoryBadge, ProgressBar, Text } from '../../components/ui';
import { spacing } from '../../theme';
import { useCategoryColor } from '../../theme/categoryColors';
import type { Category } from '../catalog/api';

interface RowProps {
  name: string;
  icon: string;
  color: string;
  totalCents: number;
  percent: number;
}

function Row({ name, icon, color, totalCents, percent }: RowProps) {
  const tint = useCategoryColor(color);
  return (
    <View
      accessible
      accessibilityLabel={`${name}, ${formatBRL(totalCents)}, ${percent}% do total`}
      style={styles.row}
    >
      <CategoryBadge icon={icon} color={color} size={36} />
      <View style={styles.body}>
        <View style={styles.line}>
          <Text variant="bodyBold" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          <Text variant="bodyBold">{formatBRL(totalCents)}</Text>
        </View>
        <ProgressBar percent={percent} color={tint} label={`${name}: ${percent}%`} />
      </View>
    </View>
  );
}

interface CategoryBarsProps {
  data: TopCategories;
  categoryById: ReadonlyMap<string, Category>;
}

/** Ranking de categorias com barras proporcionais; o excedente vira "Outras". */
export function CategoryBars({ data, categoryById }: CategoryBarsProps) {
  const rows = data.top.map((c: CategoryTotal) => {
    const category = c.categoryId ? categoryById.get(c.categoryId) : undefined;
    return (
      <Row
        key={c.categoryId ?? 'none'}
        name={category?.name ?? 'Sem categoria'}
        icon={category?.icon ?? 'pricetag-outline'}
        color={category?.color ?? 'slate'}
        totalCents={c.totalCents}
        percent={c.percent}
      />
    );
  });
  return (
    <View style={{ gap: spacing.md }}>
      {rows}
      {data.otherCents > 0 ? (
        <Row
          name="Outras"
          icon="ellipsis-horizontal-outline"
          color="sand"
          totalCents={data.otherCents}
          percent={data.otherPercent}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  body: { flex: 1, gap: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { flexShrink: 1 },
});
