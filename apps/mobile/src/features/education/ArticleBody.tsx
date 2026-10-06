import { parseArticleBody } from '@lumioup/core';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../components/ui';
import { spacing, useTheme } from '../../theme';

/** Texto do artigo: parágrafos, subtítulos e listas simples. */
export function ArticleBody({ body }: { body: string }) {
  const { colors } = useTheme();
  const blocks = useMemo(() => parseArticleBody(body), [body]);
  return (
    <View style={{ gap: spacing.md }}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <Text key={index} variant="heading" accessibilityRole="header">
              {block.text}
            </Text>
          );
        }
        if (block.type === 'list') {
          return (
            <View key={index} style={{ gap: spacing.xs + 2 }}>
              {block.items.map((item, i) => (
                <View key={i} style={styles.item}>
                  <View style={[styles.dot, { backgroundColor: colors.primaryEdge }]} />
                  <Text style={{ flex: 1 }}>{item}</Text>
                </View>
              ))}
            </View>
          );
        }
        return <Text key={index}>{block.text}</Text>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: spacing.sm + 2, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },
});
