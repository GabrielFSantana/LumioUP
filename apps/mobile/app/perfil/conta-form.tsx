import {
  ACCOUNT_KIND_LABELS,
  isSameCatalogName,
  validateCatalogName,
  validateOpeningBalance,
  type AccountKind,
} from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  Card,
  MoneyInput,
  Screen,
  SegmentedControl,
  Text,
  TextField,
} from '../../src/components/ui';
import { friendlyCatalogError } from '../../src/features/catalog/api';
import { useAccounts, useCreateAccount, useUpdateAccount } from '../../src/features/catalog/hooks';
import { spacing } from '../../src/theme';

const KIND_OPTIONS = (Object.keys(ACCOUNT_KIND_LABELS) as AccountKind[]).map((value) => ({
  value,
  label: ACCOUNT_KIND_LABELS[value],
}));

export default function ContaFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { data: accounts } = useAccounts();
  const existing = params.id ? accounts?.find((a) => a.id === params.id) : undefined;
  const editing = Boolean(params.id);

  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('checking');
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (existing && !loaded) {
      setName(existing.name);
      setKind(existing.kind);
      setBalance(existing.openingBalanceCents);
      setLoaded(true);
    }
  }, [existing, loaded]);

  const create = useCreateAccount();
  const update = useUpdateAccount();
  const busy = create.isPending || update.isPending;

  const save = async () => {
    setError(null);
    const problem = validateCatalogName(name) ?? validateOpeningBalance(balance);
    if (problem) return setError(problem);
    const duplicate = (accounts ?? []).some(
      (a) => a.id !== params.id && isSameCatalogName(a.name, name),
    );
    if (duplicate) return setError('Já existe uma conta com esse nome.');
    try {
      if (editing && params.id) {
        await update.mutateAsync({ id: params.id, name, kind, openingBalanceCents: balance });
      } else {
        await create.mutateAsync({ name, kind, openingBalanceCents: balance });
      }
      router.back();
    } catch (e) {
      setError(friendlyCatalogError(e));
    }
  };

  const toggleArchive = async () => {
    if (!existing) return;
    try {
      await update.mutateAsync({ id: existing.id, isArchived: !existing.isArchived });
      router.back();
    } catch (e) {
      setError(friendlyCatalogError(e));
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
      <TextField
        label="Nome da conta"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        maxLength={40}
      />

      <View style={{ gap: spacing.xs }}>
        <Text variant="caption">Tipo</Text>
        <SegmentedControl
          label="Tipo de conta"
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
        />
      </View>

      <Card>
        <MoneyInput label="Saldo inicial" valueCents={balance} onChangeCents={setBalance} />
        <Text variant="caption" style={{ textAlign: 'center' }}>
          Quanto havia nesta conta quando você começou a usar o LumioUP.
        </Text>
      </Card>

      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Button label={busy ? 'Salvando…' : 'Salvar'} onPress={save} disabled={busy} />
      {editing && existing ? (
        <Button
          label={existing.isArchived ? 'Restaurar conta' : 'Arquivar conta'}
          variant="secondary"
          onPress={toggleArchive}
          disabled={busy}
        />
      ) : null}
    </Screen>
  );
}
