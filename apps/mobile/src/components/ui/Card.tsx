import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { edge, radius, spacing, useTheme } from '../../theme';

interface CardProps {
  children: ReactNode;
  /** Realça o cartão (ex.: item do usuário no ranking). */
  highlight?: boolean;
  style?: ViewStyle;
}

export function Card({ children, highlight = false, style }: CardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: highlight ? colors.primarySoft : colors.surface,
          borderColor: highlight ? colors.primaryEdge : colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderBottomWidth: edge,
    gap: spacing.sm,
  },
});
