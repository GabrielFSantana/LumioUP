import { Ionicons } from '@expo/vector-icons';
import { isQuizPassed, quizPercent } from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Screen, Text, useToast } from '../../src/components/ui';
import {
  friendlyEducationError,
  type QuizAnswerResult,
  type QuizQuestion,
} from '../../src/features/education/api';
import { useArticle, useQuizQuestions, useSubmitQuiz } from '../../src/features/education/hooks';
import { minTouch, radius, spacing, useTheme } from '../../src/theme';

function Option({
  label,
  selected,
  correct,
  wrong,
  locked,
  onPress,
}: {
  label: string;
  selected: boolean;
  /** Depois de responder: esta é a alternativa certa. */
  correct: boolean;
  /** Depois de responder: a pessoa marcou esta e ela não era a certa. */
  wrong: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const borderColor = correct ? colors.income : selected ? colors.primaryEdge : colors.border;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: locked }}
      accessibilityLabel={`${label}${correct ? '. Resposta certa' : ''}${wrong ? '. Sua resposta' : ''}`}
      disabled={locked}
      onPress={onPress}
      style={[
        styles.option,
        {
          borderColor,
          backgroundColor: selected && !locked ? colors.primarySoft : colors.surface,
          borderBottomWidth: selected || correct ? 4 : 2,
        },
      ]}
    >
      <Text style={{ flex: 1 }}>{label}</Text>
      {correct ? <Ionicons name="checkmark-circle" size={22} color={colors.income} /> : null}
      {wrong ? <Text variant="caption">Sua resposta</Text> : null}
    </Pressable>
  );
}

function Question({
  question,
  answer,
  result,
  onAnswer,
}: {
  question: QuizQuestion;
  answer: number | null;
  result: QuizAnswerResult | undefined;
  onAnswer: (index: number) => void;
}) {
  return (
    <Card>
      <Text variant="bodyBold">{`${question.position}. ${question.prompt}`}</Text>
      <View accessibilityRole="radiogroup" style={{ gap: spacing.sm }}>
        {question.options.map((option, index) => (
          <Option
            key={index}
            label={option}
            selected={answer === index}
            correct={result ? result.correctIndex === index : false}
            wrong={result ? answer === index && !result.isCorrect : false}
            locked={Boolean(result)}
            onPress={() => onAnswer(index)}
          />
        ))}
      </View>
      {result ? <Text variant="caption">{result.explanation}</Text> : null}
    </Card>
  );
}

export default function QuizScreen() {
  const router = useRouter();
  const toast = useToast();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const { data: article } = useArticle(slug);
  const { data: questions, isLoading, isError } = useQuizQuestions(slug);
  const submit = useSubmitQuiz();

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [results, setResults] = useState<QuizAnswerResult[] | null>(null);

  if (isLoading) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }
  if (isError || !slug || !questions || questions.length === 0) {
    return (
      <Screen withHeader>
        <Text>Esse quiz não está disponível.</Text>
        <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const allAnswered = questions.every((q) => answers[q.position] !== undefined);
  const correctCount = results ? results.filter((r) => r.isCorrect).length : 0;
  const passed = results ? isQuizPassed(correctCount, questions.length) : false;

  const send = async () => {
    try {
      const ordered = questions.map((q) => answers[q.position] as number);
      setResults(await submit.mutateAsync({ slug, answers: ordered }));
    } catch (e) {
      toast.show({ message: friendlyEducationError(e) });
    }
  };

  const retry = () => {
    setAnswers({});
    setResults(null);
  };

  return (
    <Screen withHeader>
      {article ? <Text variant="title">{article.title}</Text> : null}
      <Text variant="caption">
        Acerte pelo menos 2 de 3 para passar. Você pode refazer quando quiser.
      </Text>

      {questions.map((question) => (
        <Question
          key={question.position}
          question={question}
          answer={answers[question.position] ?? null}
          result={results?.find((r) => r.position === question.position)}
          onAnswer={(index) => setAnswers((prev) => ({ ...prev, [question.position]: index }))}
        />
      ))}

      {results ? (
        <Card highlight={passed}>
          <Text variant="heading">{passed ? 'Quiz concluído!' : 'Quase lá'}</Text>
          <Text>
            {`Você acertou ${correctCount} de ${questions.length} (${quizPercent(correctCount, questions.length)}%).`}
          </Text>
          <Text variant="caption">
            {passed
              ? 'O XP do quiz é somado na primeira vez que você passa em cada artigo.'
              : 'Releia o artigo com calma e tente de novo quando quiser.'}
          </Text>
          <Button label="Tentar de novo" variant="secondary" onPress={retry} />
          <Button label="Voltar ao artigo" onPress={() => router.back()} />
        </Card>
      ) : (
        <Button
          label={submit.isPending ? 'Enviando…' : 'Enviar respostas'}
          onPress={send}
          disabled={!allAnswered || submit.isPending}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 2,
  },
});
