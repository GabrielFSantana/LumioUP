import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/ui';
import { useTheme } from '../../theme';

const LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

interface WeekStripProps {
  /** Índices 0 (domingo) a 6 (sábado) dos dias com registro. */
  activeDays: readonly number[];
  /** Dia da semana de hoje (0-6); padrão: o do aparelho. */
  today?: number;
}

/** Os 7 dias da semana: acesos (amarelo) quando houve registro, hoje com contorno. */
export function WeekStrip({ activeDays, today = new Date().getDay() }: WeekStripProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="list">
      {LABELS.map((label, i) => {
        const on = activeDays.includes(i);
        const isToday = i === today;
        return (
          <View
            key={i}
            style={styles.item}
            accessible
            accessibilityLabel={`${NAMES[i]}${isToday ? ', hoje' : ''}: ${on ? 'com registro' : 'sem registro'}`}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: on ? colors.primary : colors.surface,
                  borderColor: on ? colors.primaryEdge : isToday ? colors.text : colors.border,
                  borderBottomWidth: on ? 4 : 2,
                },
              ]}
            />
            <Text variant="caption" tone={isToday ? 'text' : 'textMuted'}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { alignItems: 'center', gap: 4, width: 40 },
  dot: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
});
