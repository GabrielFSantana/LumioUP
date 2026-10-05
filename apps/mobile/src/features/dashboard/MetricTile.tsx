import { StyleSheet, View } from 'react-native';
import { edge, radius, spacing, useTheme, type Palette } from '../../theme';
import { Text } from '../../components/ui';

interface MetricTileProps {
  label: string;
  value: string;
  /** Cor do valor (chave da paleta). */
  tone?: keyof Palette;
}

/** Indicador pequeno: rótulo e valor. Dois por linha. */
export function MetricTile({ label, value, tone = 'text' }: MetricTileProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text variant="caption">{label}</Text>
      <Text variant="heading" tone={tone}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderBottomWidth: edge - 1,
  },
});
