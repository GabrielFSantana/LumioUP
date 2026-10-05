import { StyleSheet, Text } from 'react-native';
import { spacing, useTheme } from '../../theme';
import { Card } from './Card';

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 15, lineHeight: 22, paddingBottom: spacing.xs },
});
