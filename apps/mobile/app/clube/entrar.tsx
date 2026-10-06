import { extractInviteCode, formatInviteCode } from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Button, Card, Screen, Text, TextField } from '../../src/components/ui';
import { friendlyClubError, previewClub, type ClubPreview } from '../../src/features/clubs/api';
import { useJoinClub } from '../../src/features/clubs/hooks';

export default function EntrarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ codigo?: string }>();
  const join = useJoinClub();

  const [text, setText] = useState(params.codigo ?? '');
  const [preview, setPreview] = useState<ClubPreview | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSearched = useRef(false);

  const search = async (value: string) => {
    setError(null);
    setPreview(null);
    setNotFound(false);
    const code = extractInviteCode(value);
    if (!code) return setError('O código tem 8 letras e números, como ABCD-EFGH.');
    setSearching(true);
    try {
      const found = await previewClub(code);
      if (found) setPreview(found);
      else setNotFound(true);
    } catch (e) {
      setError(friendlyClubError(e));
    } finally {
      setSearching(false);
    }
  };

  // Link de convite: já procura o clube ao abrir.
  useEffect(() => {
    if (params.codigo && !autoSearched.current) {
      autoSearched.current = true;
      void search(params.codigo);
    }
  }, [params.codigo]);

  const enter = async () => {
    const code = extractInviteCode(text);
    if (!code) return;
    setError(null);
    try {
      const id = await join.mutateAsync(code);
      if (id) router.replace({ pathname: '/clube', params: { id } });
      else setNotFound(true);
    } catch (e) {
      setError(friendlyClubError(e));
    }
  };

  const blocked = preview ? preview.isFull || !preview.invitesEnabled : false;

  return (
    <Screen withHeader>
      <TextField
        label="Código do clube"
        value={text}
        onChangeText={(value) => {
          setText(value);
          setPreview(null);
          setNotFound(false);
          setError(null);
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ABCD-EFGH"
        maxLength={80}
        onSubmitEditing={() => search(text)}
      />
      <Button
        label={searching ? 'Procurando…' : 'Procurar clube'}
        variant="secondary"
        onPress={() => search(text)}
        disabled={searching}
      />

      {notFound ? (
        <Card>
          <Text>Não encontramos um clube com esse código. Confira com quem te convidou.</Text>
        </Card>
      ) : null}

      {preview ? (
        <Card>
          <Text variant="title">{preview.name}</Text>
          <Text variant="caption">{`${preview.memberCount} de ${preview.maxMembers} membros`}</Text>
          {preview.isFull ? <Text>Esse clube está cheio no momento.</Text> : null}
          {!preview.invitesEnabled ? (
            <Text>A entrada por código está desligada neste clube.</Text>
          ) : null}
          <Text variant="caption">
            Ao entrar, os membros veem seu nome, nível e XP. Valores em reais, lançamentos, contas e
            metas nunca são compartilhados.
          </Text>
          <Button
            label={join.isPending ? 'Entrando…' : `Entrar em ${preview.name}`}
            onPress={enter}
            disabled={join.isPending || blocked}
          />
        </Card>
      ) : null}

      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      {text && extractInviteCode(text) ? (
        <Text variant="caption">{`Código: ${formatInviteCode(extractInviteCode(text) ?? '')}`}</Text>
      ) : null}
    </Screen>
  );
}
