import { Pressable, StyleSheet, View } from 'react-native';
import { edge, fonts, minTouch, radius, spacing, useTheme } from '../../theme';
import { Text } from './Text';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

/** Botão com "base" sólida: afunda ao toque (sem animação, respeita "reduzir movimento"). */
export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const { colors } = useTheme();
  const primary = variant === 'primary';
  const faceColor = primary ? colors.primary : colors.surface;
  const edgeColor = primary ? colors.primaryEdge : colors.border;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.base, { backgroundColor: edgeColor, opacity: disabled ? 0.5 : 1 }]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.face,
            {
              backgroundColor: faceColor,
              borderColor: primary ? faceColor : colors.border,
              transform: [{ translateY: pressed ? edge - 1 : 0 }],
            },
          ]}
        >
          <Text
            style={{ fontFamily: fonts.display, fontSize: 17 }}
            tone={primary ? 'onPrimary' : 'text'}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, paddingBottom: edge },
  face: {
    minHeight: minTouch,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
