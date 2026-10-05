import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { edge, minTouch, radius, spacing, useTheme, type Palette } from '../../theme';
import { Text } from './Text';

interface MenuRowProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  /** Elemento à esquerda (ex.: CategoryBadge ou ícone). */
  leading?: ReactNode;
  /** Texto de apoio à direita (ex.: saldo). */
  trailing?: string;
  /** Cor do texto da direita (ex.: receita em verde). */
  trailingTone?: keyof Palette;
  muted?: boolean;
}

export function MenuRow({
  title,
  subtitle,
  onPress,
  leading,
  trailing,
  trailingTone,
  muted,
}: MenuRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, trailing].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: muted ? 0.6 : 1,
          transform: [{ translateY: pressed ? 2 : 0 }],
        },
      ]}
    >
      {leading}
      <View style={styles.text}>
        <Text variant="bodyBold">{title}</Text>
        {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
      </View>
      {trailing ? (
        <Text variant="bodyBold" tone={trailingTone}>
          {trailing}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouch + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderBottomWidth: edge - 1,
  },
  text: { flex: 1 },
});
