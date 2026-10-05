import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { radius, spacing, useTheme, type Palette } from '../../theme';
import { Text } from './Text';

interface ChipProps {
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  /** Chave da paleta usada no ícone e no texto. */
  tone?: keyof Palette;
}

export function Chip({ label, icon, tone = 'text' }: ChipProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {icon ? <Ionicons name={icon} size={16} color={colors[tone]} /> : null}
      <Text variant="caption" tone={tone}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignSelf: 'flex-start',
  },
});
