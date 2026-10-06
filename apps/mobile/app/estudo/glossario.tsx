import { searchGlossary } from '@lumioup/core';
import { useState } from 'react';
import { Card, EmptyState, Screen, Text, TextField } from '../../src/components/ui';
import { useGlossary } from '../../src/features/education/hooks';

export default function GlossarioScreen() {
  const { data, isLoading, isError } = useGlossary();
  const [query, setQuery] = useState('');
  const terms = searchGlossary(data ?? [], query);

  return (
    <Screen withHeader>
      <TextField
        label="Buscar termo"
        value={query}
        onChangeText={setQuery}
        placeholder="Ex.: liquidez"
        autoCorrect={false}
        maxLength={40}
      />
      {isLoading ? <Text tone="textMuted">Carregando…</Text> : null}
      {isError ? <Text tone="danger">Não deu para carregar o glossário.</Text> : null}
      {!isLoading && !isError && terms.length === 0 ? (
        <EmptyState title="Nenhum termo encontrado" hint="Tente outra palavra ou limpe a busca." />
      ) : null}
      {terms.map((item) => (
        <Card key={item.term}>
          <Text variant="heading">{item.term}</Text>
          <Text>{item.definition}</Text>
          <Text variant="caption">{item.topic}</Text>
        </Card>
      ))}
    </Screen>
  );
}
