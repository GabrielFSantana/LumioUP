import { StyleSheet, View } from 'react-native';
import { radius, useTheme } from '../../theme';

interface ProgressBarProps {
  /** 0 a 100; valores fora do intervalo são limitados. */
  percent: number;
  color?: string;
  label?: string;
}

/** Barra "grossa" com brilho no topo, no estilo da barra de XP. */
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
      {value > 0 ? (
        <View
          style={[styles.fill, { width: `${value}%`, backgroundColor: color ?? colors.primary }]}
        >
          <View style={styles.shine} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 16, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, minWidth: 16 },
  shine: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
