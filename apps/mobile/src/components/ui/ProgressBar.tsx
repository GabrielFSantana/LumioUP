import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';

interface ProgressBarProps {
  /** 0 a 100; valores fora do intervalo são limitados. */
  percent: number;
  color?: string;
  label?: string;
}

export function ProgressBar({ percent, color, label }: ProgressBarProps) {
  const { colors } = useTheme();
  const value = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }}
      style={[styles.track, { backgroundColor: colors.border }]}
    >
      <View
        style={[styles.fill, { width: `${value}%`, backgroundColor: color ?? colors.primary }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
