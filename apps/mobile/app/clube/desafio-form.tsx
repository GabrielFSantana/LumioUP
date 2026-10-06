import {
  CHALLENGE_KINDS,
  CHALLENGE_KIND_ORDER,
  CHALLENGE_LIMITS,
  addDays,
  challengeDuration,
  toDateString,
  validateChallenge,
  type ChallengeErrors,
  type ChallengeKind,
  type DateString,
} from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  DateField,
  Screen,
  SegmentedControl,
  Text,
  TextField,
} from '../../src/components/ui';
import { friendlyChallengeError } from '../../src/features/challenges/api';
import { useCreateChallenge } from '../../src/features/challenges/hooks';
import { spacing } from '../../src/theme';

const DEFAULT_TARGET: Record<ChallengeKind, string> = {
  log_days: '5',
  log_count: '10',
  goal_contributions: '3',
};

const KIND_OPTIONS = CHALLENGE_KIND_ORDER.map((value) => ({
  value,
  label: CHALLENGE_KINDS[value].label,
}));

export default function DesafioFormScreen() {
  const router = useRouter();
  const { club } = useLocalSearchParams<{ club?: string }>();
  const today = toDateString(new Date());

  const [kind, setKind] = useState<ChallengeKind>('log_days');
  const [title, setTitle] = useState('');
  const [startsOn, setStartsOn] = useState<DateString | null>(today);
  const [endsOn, setEndsOn] = useState<DateString | null>(addDays(today, 6));
  const [target, setTarget] = useState(DEFAULT_TARGET.log_days);
  const [errors, setErrors] = useState<ChallengeErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const create = useCreateChallenge();

  const info = CHALLENGE_KINDS[kind];
  const duration =
    startsOn && endsOn && endsOn >= startsOn ? challengeDuration(startsOn, endsOn) : null;

  const changeKind = (next: ChallengeKind) => {
    setKind(next);
    setTarget(DEFAULT_TARGET[next]);
    setErrors({});
  };

  const save = async () => {
    setServerError(null);
    if (!club) return setServerError('Clube não encontrado. Volte e tente de novo.');
    const draft = {
      kind,
      title,
      startsOn: startsOn ?? '',
      endsOn: endsOn ?? '',
      target: Number(target),
    };
    const found = validateChallenge(draft, today);
    setErrors(found ?? {});
    if (found) return;
    try {
      const id = await create.mutateAsync({ clubId: club, ...draft });
      router.replace({ pathname: '/clube/desafio', params: { id, club } });
    } catch (e) {
      setServerError(friendlyChallengeError(e));
    }
  };

  return (
    <Screen withHeader>
      <View style={{ gap: spacing.sm }}>
        <Text variant="bodyBold">Tipo de desafio</Text>
        <SegmentedControl
          label="Tipo de desafio"
          options={KIND_OPTIONS}
          value={kind}
          onChange={changeKind}
        />
        <Text variant="caption">{info.description}</Text>
      </View>

      <TextField
        label="Nome do desafio"
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          setErrors((e) => ({ ...e, title: undefined }));
        }}
        maxLength={CHALLENGE_LIMITS.titleMaxLength}
        placeholder="Ex.: Uma semana organizada"
        error={errors.title}
      />

      <DateField
        label="Começa em"
        value={startsOn}
        onChange={(date) => {
          setStartsOn(date);
          setErrors((e) => ({ ...e, dates: undefined }));
        }}
      />
      <DateField
        label="Termina em"
        value={endsOn}
        onChange={(date) => {
          setEndsOn(date);
          setErrors((e) => ({ ...e, dates: undefined }));
        }}
      />
      {errors.dates ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {errors.dates}
        </Text>
      ) : duration ? (
        <Text variant="caption">{`Duração: ${duration} ${duration === 1 ? 'dia' : 'dias'}.`}</Text>
      ) : null}

      <TextField
        label={`Meta (${info.unitPlural})`}
        value={target}
        onChangeText={(text) => {
          setTarget(text.replace(/[^0-9]/g, ''));
          setErrors((e) => ({ ...e, target: undefined }));
        }}
        keyboardType="number-pad"
        maxLength={3}
        error={errors.target}
      />

      <Text variant="caption">
        O progresso aparece só em porcentagem. Valores em reais nunca entram em desafios. Quem
        completar ganha XP quando o clube tem 2 ou mais pessoas.
      </Text>
      {serverError ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {serverError}
        </Text>
      ) : null}
      <Button
        label={create.isPending ? 'Criando…' : 'Criar desafio'}
        onPress={save}
        disabled={create.isPending}
      />
    </Screen>
  );
}
