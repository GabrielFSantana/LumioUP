import { validateClubDescription, validateClubName } from '@lumioup/core';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, Screen, Text, TextField } from '../../src/components/ui';
import { friendlyClubError } from '../../src/features/clubs/api';
import { useCreateClub, useMyClubs, useUpdateClub } from '../../src/features/clubs/hooks';

export default function ClubeFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(params.id);
  const { data: clubs } = useMyClubs();
  const existing = params.id ? clubs?.find((c) => c.clubId === params.id) : undefined;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name);
      setDescription(existing.description ?? '');
      setLoaded(true);
    }
  }, [existing, loaded]);

  const create = useCreateClub();
  const update = useUpdateClub();
  const busy = create.isPending || update.isPending;

  const save = async () => {
    setError(null);
    const problem = validateClubName(name) ?? validateClubDescription(description);
    if (problem) return setError(problem);
    try {
      if (editing && existing) {
        await update.mutateAsync({
          clubId: existing.clubId,
          name,
          description,
          invitesEnabled: existing.invitesEnabled,
        });
        router.back();
      } else {
        const id = await create.mutateAsync({ name, description });
        router.replace({ pathname: '/clube', params: { id } });
      }
    } catch (e) {
      setError(friendlyClubError(e));
    }
  };

  if (editing && !existing) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: editing ? 'Editar clube' : 'Novo clube' }} />
      <TextField
        label="Nome do clube"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        maxLength={40}
        placeholder="Ex.: Poupadores da firma"
      />
      <TextField
        label="Descrição (opcional)"
        value={description}
        onChangeText={(text) => {
          setDescription(text);
          setError(null);
        }}
        maxLength={200}
        placeholder="Para que serve este clube?"
      />
      <Text variant="caption">
        Os membros do clube veem seu nome, nível e XP. Valores em reais, lançamentos, contas e metas
        nunca são compartilhados.
      </Text>
      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button
        label={busy ? 'Salvando…' : editing ? 'Salvar' : 'Criar clube'}
        onPress={save}
        disabled={busy}
      />
    </Screen>
  );
}
