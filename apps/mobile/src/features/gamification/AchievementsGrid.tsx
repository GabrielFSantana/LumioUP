import { Ionicons } from '@expo/vector-icons';
import { describeXpGain, formatBrDate } from '@lumioup/core';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/ui';
import { edge, spacing, useTheme } from '../../theme';
import { useCategoryColor } from '../../theme/categoryColors';
import type { AchievementView } from './hooks';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function Medal({ item }: { item: AchievementView }) {
  const { colors } = useTheme();
  const tint = useCategoryColor(item.color);
  const icon = (item.icon in Ionicons.glyphMap ? item.icon : 'ribbon-outline') as IconName;
  return (
    <View
      accessible
      accessibilityLabel={
        item.unlocked
          ? `${item.name}. ${item.description} Desbloqueada em ${formatBrDate(
              (item.unlockedAt ?? '').slice(0, 10),
            )}.`
          : `${item.name}. Bloqueada. ${item.description} Vale ${describeXpGain(item.xpReward)}.`
      }
      style={styles.cell}
    >
      <View
        style={[
          styles.medal,
          item.unlocked
            ? { backgroundColor: colors.primarySoft, borderColor: colors.primaryEdge }
            : { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name={item.unlocked ? icon : 'lock-closed-outline'}
          size={28}
          color={item.unlocked ? tint : colors.textMuted}
        />
      </View>
      <Text
        variant="caption"
        tone={item.unlocked ? 'text' : 'textMuted'}
        numberOfLines={2}
        style={styles.name}
      >
        {item.name}
      </Text>
    </View>
  );
}

/** Medalhas de conquistas: acesas quando desbloqueadas, com cadeado quando não. */
export function AchievementsGrid({ items }: { items: readonly AchievementView[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Medal key={item.code} item={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cell: { width: '30%', flexGrow: 1, alignItems: 'center', gap: spacing.xs + 2 },
  medal: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderBottomWidth: edge - 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { textAlign: 'center' },
});
