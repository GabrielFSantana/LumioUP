import { canCreateChallenge, CHALLENGE_LIMITS } from '@lumioup/core';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Button, Text } from '../../components/ui';
import { spacing } from '../../theme';
import type { ClubSummary } from '../clubs/api';
import { ChallengeCard } from './ChallengeCard';
import { useChallenges } from './hooks';

/** Desafios do clube (dentro do detalhe do clube). */
export function ChallengesSection({ club }: { club: ClubSummary }) {
  const router = useRouter();
  const { data, isLoading, isError } = useChallenges(club.clubId);
  const challenges = data ?? [];
  const canCreate = canCreateChallenge(club.role);

  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="heading">Desafios</Text>
      {isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
      {isError ? (
        <Text tone="danger">Não deu para carregar os desafios. Tente de novo em instantes.</Text>
      ) : null}
      {!isLoading && !isError && challenges.length === 0 ? (
        <Text tone="textMuted">
          {canCreate
            ? 'Nenhum desafio ainda. Crie um para o clube se organizar junto.'
            : 'Nenhum desafio por enquanto. Donos e admins podem criar.'}
        </Text>
      ) : null}
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          onOpen={() =>
            router.push({
              pathname: '/clube/desafio',
              params: { id: challenge.id, club: club.clubId },
            })
          }
        />
      ))}
      {canCreate ? (
        <>
          <Button
            label="Novo desafio"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/clube/desafio-form', params: { club: club.clubId } })
            }
          />
          <Text variant="caption">
            {`Desafios medem ações (dias organizados, lançamentos, contribuições), nunca valores. Até ${CHALLENGE_LIMITS.activePerClub} ativos por clube.`}
          </Text>
        </>
      ) : null}
    </View>
  );
}
