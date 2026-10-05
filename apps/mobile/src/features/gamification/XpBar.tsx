import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ProgressBar, Text } from '../../components/ui';
import { spacing } from '../../theme';
import { useLevelProgress } from './hooks';

/** Barra de XP compacta do Início. Toque para abrir a Jornada. */
export function XpBar() {
  const router = useRouter();
  const { progress, totalXp } = useLevelProgress();
  if (!progress) return null;

  const caption = progress.isMax
    ? `${totalXp} XP · nível máximo`
    : `${progress.xpIntoLevel} / ${progress.xpForLevel} XP · faltam ${progress.xpToNext} para ${progress.next?.name}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Nível ${progress.current.level}, ${progress.current.name}. ${caption}. Abrir jornada.`}
      onPress={() => router.push('/xp')}
      style={styles.wrap}
    >
      <View style={styles.line}>
        <Text variant="bodyBold">{`Nível ${progress.current.level} · ${progress.current.name}`}</Text>
        <Text variant="caption">{`${totalXp} XP`}</Text>
      </View>
      <ProgressBar percent={progress.percent} label="Progresso de XP no nível" />
      <Text variant="caption">{caption}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
