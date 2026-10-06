import { CLUB_ROLE_LABELS } from '@lumioup/core';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  CategoryBadge,
  Chip,
  EmptyState,
  Screen,
  Text,
} from '../../src/components/ui';
import { useMyClubs } from '../../src/features/clubs/hooks';
import { spacing } from '../../src/theme';

export default function ClubesScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useMyClubs();
  const clubs = data ?? [];

  return (
    <Screen title="Clubes">
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button label="Criar clube" onPress={() => router.push('/clube/form')} />
        </View>
        <View style={styles.action}>
          <Button
            label="Entrar com código"
            variant="secondary"
            onPress={() => router.push('/clube/entrar')}
          />
        </View>
      </View>

      {isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
      {isError ? (
        <>
          <EmptyState title="Não deu para carregar" hint="Verifique sua conexão e tente de novo." />
          <Button label="Tentar de novo" variant="secondary" onPress={() => refetch()} />
        </>
      ) : null}

      {!isLoading && !isError && clubs.length === 0 ? (
        <EmptyState
          title="Você ainda não está em um clube"
          hint="Crie um clube ou entre com um código para fazer desafios com amigos. Seus valores nunca aparecem para ninguém."
        />
      ) : null}

      {clubs.map((club) => (
        <Pressable
          key={club.clubId}
          accessibilityRole="button"
          accessibilityLabel={`${club.name}. ${club.memberCount} membros. Seu papel: ${CLUB_ROLE_LABELS[club.role]}`}
          onPress={() => router.push({ pathname: '/clube', params: { id: club.clubId } })}
          style={({ pressed }) => ({ transform: [{ translateY: pressed ? 2 : 0 }] })}
        >
          <Card>
            <View style={styles.header}>
              <CategoryBadge icon="people-outline" color="teal" size={44} />
              <View style={{ flex: 1 }}>
                <Text variant="heading" numberOfLines={1}>
                  {club.name}
                </Text>
                <Text variant="caption">{`${club.memberCount} de ${club.maxMembers} membros`}</Text>
              </View>
              <Chip label={CLUB_ROLE_LABELS[club.role]} />
            </View>
            {club.description ? (
              <Text variant="caption" tone="text" numberOfLines={2}>
                {club.description}
              </Text>
            ) : null}
          </Card>
        </Pressable>
      ))}

      <Text variant="caption">
        Nos clubes aparecem só seu nome, nível e XP. Valores em reais, lançamentos, contas e metas
        nunca são compartilhados.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
});
