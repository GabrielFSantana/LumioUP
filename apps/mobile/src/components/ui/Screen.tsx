import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { spacing, useTheme } from '../../theme';

/** Contêiner padrão das telas das abas: fundo do tema, rolagem e título. */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.md },
  title: { fontSize: 28, fontWeight: '800' },
});
