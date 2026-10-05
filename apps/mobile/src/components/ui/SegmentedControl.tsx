import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { minTouch, radius, spacing, useTheme } from '../../theme';
import { Text } from './Text';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  /** Quando verdadeiro, as opções rolam na horizontal em vez de quebrar de linha (filtros). */
  scrollable?: boolean;
}

/** Escolha única em formato de "pílulas" que quebram de linha quando faltar espaço. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  scrollable = false,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const items = options.map((option) => {
    const selected = option.value === value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={option.label}
        onPress={() => onChange(option.value)}
        style={[
          styles.item,
          !scrollable && styles.grow,
          {
            backgroundColor: selected ? colors.primarySoft : colors.surface,
            borderColor: selected ? colors.primaryEdge : colors.border,
            borderBottomWidth: selected ? 4 : 2,
          },
        ]}
      >
        <Text variant="bodyBold" style={{ fontSize: 14 }}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        contentContainerStyle={styles.scrollRow}
      >
        {items}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
      {items}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  scrollRow: { flexDirection: 'row', gap: spacing.sm, paddingRight: spacing.md },
  item: {
    minHeight: minTouch - 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flexGrow: 1 },
});
