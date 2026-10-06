import { Ionicons } from '@expo/vector-icons';
import { EDUCATION_DISCLAIMER, readingTimeLabel } from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Screen, Text, useToast } from '../../src/components/ui';
import { friendlyEducationError } from '../../src/features/education/api';
import { ArticleBody } from '../../src/features/education/ArticleBody';
import {
  useArticle,
  useCompleteArticle,
  useEducationProgress,
} from '../../src/features/education/hooks';
import { spacing, useTheme } from '../../src/theme';

export default function ArtigoScreen() {
  const router = useRouter();
  const toast = useToast();
  const { colors } = useTheme();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const { data: article, isLoading, isError } = useArticle(slug);
  const progress = useEducationProgress();
  const complete = useCompleteArticle();

  const mine = progress.data?.find((row) => row.articleSlug === slug);
  const done = Boolean(mine?.completedAt);

  if (isLoading) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }
  if (isError || !article) {
    return (
      <Screen withHeader>
        <Text>Esse artigo não está disponível.</Text>
        <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const markRead = async () => {
    try {
      await complete.mutateAsync(article.slug);
      toast.show({ message: 'Artigo lido. Bom aprendizado!' });
    } catch (e) {
      toast.show({ message: friendlyEducationError(e) });
    }
  };

  return (
    <Screen withHeader>
      <Card>
        <View style={styles.meta}>
          <Chip label={article.topic} />
          <Text variant="caption">{readingTimeLabel(article.readMinutes)}</Text>
        </View>
        <Text variant="title" accessibilityRole="header">
          {article.title}
        </Text>
        <Text tone="textMuted">{article.summary}</Text>
      </Card>

      <ArticleBody body={article.body} />

      <Card>
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
          <Text variant="caption" style={{ flex: 1 }}>
            {EDUCATION_DISCLAIMER}
          </Text>
        </View>
      </Card>

      {done ? (
        <Chip label="Você já leu este artigo" icon="checkmark-circle" tone="income" />
      ) : (
        <Button
          label={complete.isPending ? 'Salvando…' : 'Marcar como lido'}
          onPress={markRead}
          disabled={complete.isPending}
        />
      )}
      <Button
        label={mine?.quizPassedAt ? 'Refazer o quiz' : 'Fazer o quiz'}
        variant="secondary"
        onPress={() => router.push({ pathname: '/estudo/quiz', params: { slug: article.slug } })}
      />
      {mine?.quizBestPct !== null && mine?.quizBestPct !== undefined ? (
        <Text variant="caption">{`Sua melhor nota no quiz: ${mine.quizBestPct}%.`}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
});
