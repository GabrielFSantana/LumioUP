import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Mascot, ProgressBar, Text } from '../../components/ui';
import { spacing, useTheme } from '../../theme';
import { useAcknowledgeLevel, useLevels, useUserStats } from './hooks';
import { Rays } from './Rays';

/**
 * Tela de subida de nível (uma vez por nível). Aparece quando `level > celebrated_level`
 * e some ao continuar, registrando a comemoração no servidor.
 */
export function LevelUpOverlay() {
  const { colors } = useTheme();
  const { data: stats } = useUserStats();
  const { data: levels } = useLevels();
  const acknowledge = useAcknowledgeLevel();
  const [dismissedLevel, setDismissedLevel] = useState(0);

  if (!stats || !levels) return null;
  if (stats.level <= stats.celebratedLevel || stats.level <= dismissedLevel) return null;
  const level = levels.find((l) => l.level === stats.level);
  if (!level) return null;

  const continueJourney = () => {
    setDismissedLevel(stats.level);
    acknowledge.mutate();
  };

  return (
    <View
      accessibilityViewIsModal
      accessibilityRole="alert"
      style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: colors.background }]}
    >
      <Rays color={colors.primarySoft} />
      <View style={styles.center}>
        <View style={[styles.badge, { backgroundColor: colors.text }]}>
          <Text variant="heading" style={{ color: colors.background }}>
            {`NÍVEL ${level.level}`}
          </Text>
        </View>
        <Mascot size={190} mood="cheer" />
        <Text variant="display" style={styles.center2}>
          {`Você virou ${level.name}!`}
        </Text>
        <Text tone="textMuted" style={styles.center2}>
          Seus hábitos acenderam ainda mais a luz do Lumi.
        </Text>
        <View style={styles.bar}>
          <ProgressBar percent={100} label="Nível alcançado" />
          <Text variant="caption" style={styles.center2}>{`${level.minXp} XP`}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <Button label="Continuar" onPress={continueJourney} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 100, padding: spacing.lg, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  center2: { textAlign: 'center' },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 999 },
  bar: { alignSelf: 'stretch', gap: spacing.xs, marginTop: spacing.sm },
  footer: { paddingBottom: spacing.md },
});
