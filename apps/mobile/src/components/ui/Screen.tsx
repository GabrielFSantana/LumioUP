import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, useTheme } from '../../theme';
import { Text } from './Text';

interface ScreenProps {
  /** Omita quando a tela monta o próprio cabeçalho (ex.: Início) ou usa o do navegador. */
  title?: string;
  /** Verdadeiro quando o navegador já mostra um cabeçalho (ele cuida da área segura do topo). */
  withHeader?: boolean;
  children: ReactNode;
}

/** Contêiner padrão das telas: fundo do tema, área segura, rolagem e título. */
export function Screen({ title, withHeader = false, children }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: (withHeader ? 0 : insets.top) + spacing.md,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {title ? (
        <Text accessibilityRole="header" variant="display">
          {title}
        </Text>
      ) : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.md, gap: spacing.md },
});
