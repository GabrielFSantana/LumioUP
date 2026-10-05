import { StyleSheet, View } from 'react-native';
import { spacing } from '../../theme';
import { Card } from './Card';
import { Mascot } from './Mascot';
import { Text } from './Text';

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <Card>
      <View style={styles.center}>
        <Mascot size={88} />
        <Text variant="title" style={styles.centerText}>
          {title}
        </Text>
        <Text tone="textMuted" style={styles.centerText}>
          {hint}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  centerText: { textAlign: 'center' },
});
