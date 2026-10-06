import { Ionicons } from '@expo/vector-icons';
import { EDUCATION_DISCLAIMER, readingTimeLabel } from '@lumioup/core';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  MenuRow,
  ProgressBar,
  Screen,
  Text,
} from '../../src/components/ui';
import {
  useArticles,
  useEducationProgress,
  useRecommendations,
  useTrack,
  useTrackProgress,
} from '../../src/features/education/hooks';
import { spacing, useTheme } from '../../src/theme';

export default function AprenderScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const articles = useArticles();
  const track = useTrack();
  const progressRows = useEducationProgress();
  const recommendations = useRecommendations();
  const { progress, completed } = useTrackProgress();

  const bySlug = new Map((articles.data ?? []).map((article) => [article.slug, article]));
  const passed = new Set(
    (progressRows.data ?? [])
      .filter((row) => row.quizPassedAt !== null)
      .map((row) => row.articleSlug),
  );
  const open = (slug: string) => router.push({ pathname: '/estudo/artigo', params: { slug } });

  const suggestions = (recommendations.data ?? []).filter((item) => bySlug.has(item.articleSlug));
  const failed = articles.isError || track.isError;

  return (
    <Screen title="Aprender">
      <Card>
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
          <Text variant="caption" style={{ flex: 1 }}>
            {EDUCATION_DISCLAIMER}
          </Text>
        </View>
      </Card>

      {failed ? (
        <EmptyState
          title="Não deu para carregar os conteúdos"
          hint="Verifique sua conexão e abra a aba de novo."
        />
      ) : null}

      {suggestions.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="heading">Para você</Text>
          {suggestions.map((item) => {
            const article = bySlug.get(item.articleSlug);
            if (!article) return null;
            return (
              <MenuRow
                key={item.articleSlug}
                title={article.title}
                subtitle={item.reason}
                onPress={() => open(item.articleSlug)}
                leading={<Ionicons name="bulb-outline" size={24} color={colors.primaryEdge} />}
              />
            );
          })}
        </View>
      ) : null}

      {track.data && progress ? (
        <View style={{ gap: spacing.sm }}>
          <Card highlight={progress.completed}>
            <View style={styles.row}>
              <Text variant="heading" style={{ flex: 1 }}>
                {track.data.title}
              </Text>
              {progress.completed ? (
                <Chip label="Concluída" icon="checkmark-circle" tone="income" />
              ) : null}
            </View>
            <Text variant="caption">{track.data.description}</Text>
            <ProgressBar
              percent={progress.percent}
              color={progress.completed ? colors.income : undefined}
              label={`Progresso na trilha: ${progress.percent}%`}
            />
            <Text variant="caption">{`${progress.done} de ${progress.total} artigos lidos`}</Text>
            {progress.nextSlug && bySlug.get(progress.nextSlug) ? (
              <Button
                label={progress.done === 0 ? 'Começar a trilha' : 'Continuar a trilha'}
                onPress={() => open(progress.nextSlug as string)}
              />
            ) : null}
          </Card>

          {track.data.articleSlugs.map((slug, index) => {
            const article = bySlug.get(slug);
            if (!article) return null;
            const done = completed.has(slug);
            return (
              <MenuRow
                key={slug}
                title={article.title}
                subtitle={`${article.topic} · ${readingTimeLabel(article.readMinutes)}${
                  passed.has(slug) ? ' · quiz feito' : ''
                }`}
                trailing={done ? 'Lido' : undefined}
                trailingTone={done ? 'income' : undefined}
                onPress={() => open(slug)}
                leading={
                  done ? (
                    <Ionicons name="checkmark-circle" size={28} color={colors.income} />
                  ) : (
                    <View style={[styles.number, { borderColor: colors.border }]}>
                      <Text variant="bodyBold">{index + 1}</Text>
                    </View>
                  )
                }
              />
            );
          })}
        </View>
      ) : null}

      <MenuRow
        title="Glossário"
        subtitle="Termos financeiros em linguagem simples"
        onPress={() => router.push('/estudo/glossario')}
        leading={<Ionicons name="book-outline" size={26} color={colors.primaryEdge} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
