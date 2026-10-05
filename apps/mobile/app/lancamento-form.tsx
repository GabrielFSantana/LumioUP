import {
  categoryKindFor,
  toDateString,
  validateTransaction,
  type DateString,
  type TransactionKind,
} from '@lumioup/core';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  Card,
  DateField,
  MoneyInput,
  Screen,
  SegmentedControl,
  Text,
  TextField,
  useToast,
} from '../src/components/ui';
import { useAccounts, useCategories } from '../src/features/catalog/hooks';
import { friendlyTransactionError } from '../src/features/transactions/api';
import { CategoryPicker } from '../src/features/transactions/CategoryPicker';
import {
  useCreateTransaction,
  useSetTransactionDeleted,
  useTransaction,
  useUpdateTransaction,
} from '../src/features/transactions/hooks';
import { spacing } from '../src/theme';

type FormKind = Extract<TransactionKind, 'expense' | 'income' | 'transfer'>;

const KIND_OPTIONS = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Receita' },
  { value: 'transfer', label: 'Transferência' },
] as const;

const FORM_KINDS: readonly string[] = KIND_OPTIONS.map((o) => o.value);

export default function LancamentoFormScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const editing = Boolean(params.id);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: existing, isLoading: loadingExisting } = useTransaction(params.id);

  const [kind, setKind] = useState<FormKind>(
    FORM_KINDS.includes(params.kind ?? '') ? (params.kind as FormKind) : 'expense',
  );
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [date, setDate] = useState<DateString | null>(toDateString(new Date()));
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const setDeleted = useSetTransactionDeleted();
  const busy = create.isPending || update.isPending || setDeleted.isPending;

  const activeAccounts = (accounts ?? []).filter(
    (a) => !a.isArchived || a.id === existing?.accountId || a.id === existing?.toAccountId,
  );
  const wantedCategoryKind = categoryKindFor(kind);
  const visibleCategories = (categories ?? []).filter(
    (c) => c.kind === wantedCategoryKind && (!c.isArchived || c.id === existing?.categoryId),
  );

  // Edição: preenche o formulário uma única vez quando o lançamento carregar.
  useEffect(() => {
    if (existing && !loaded) {
      if (FORM_KINDS.includes(existing.kind)) setKind(existing.kind as FormKind);
      setAmount(existing.amountCents);
      setCategoryId(existing.categoryId);
      setAccountId(existing.accountId);
      setToAccountId(existing.toAccountId);
      setDate(existing.occurredOn);
      setDescription(existing.description ?? '');
      setLoaded(true);
    }
  }, [existing, loaded]);

  // Novo lançamento: começa pela primeira conta ativa (normalmente a Carteira).
  useEffect(() => {
    if (!editing && !accountId && accounts) {
      const first = accounts.find((a) => !a.isArchived);
      if (first) setAccountId(first.id);
    }
  }, [editing, accountId, accounts]);

  const changeKind = (next: FormKind) => {
    setKind(next);
    setCategoryId(null);
    setToAccountId(null);
    setError(null);
  };

  const save = async () => {
    setError(null);
    if (date === null) return setError('Informe uma data válida.');
    if (!accountId) return setError('Escolha a conta.');
    const problems = validateTransaction({
      kind,
      amountCents: amount,
      occurredOn: date,
      accountId,
      ...(kind === 'transfer' ? { toAccountId: toAccountId ?? undefined } : {}),
      ...(kind !== 'transfer' && categoryId ? { categoryId } : {}),
    });
    if (amount <= 0) return setError('Informe um valor maior que zero.');
    if (kind !== 'transfer' && !categoryId) return setError('Escolha uma categoria.');
    if (problems.length > 0) return setError(problems[0] ?? 'Confira os dados.');

    const input = {
      kind,
      amountCents: amount,
      occurredOn: date,
      accountId,
      toAccountId: kind === 'transfer' ? toAccountId : null,
      categoryId: kind === 'transfer' ? null : categoryId,
      description,
    };
    try {
      if (editing && params.id) await update.mutateAsync({ id: params.id, input });
      else await create.mutateAsync(input);
      router.back();
    } catch (e) {
      setError(friendlyTransactionError(e));
    }
  };

  const remove = async () => {
    if (!params.id) return;
    const id = params.id;
    try {
      await setDeleted.mutateAsync({ id, deleted: true });
      router.back();
      toast.show({
        message: 'Lançamento excluído',
        actionLabel: 'Desfazer',
        onAction: () => setDeleted.mutate({ id, deleted: false }),
      });
    } catch (e) {
      setError(friendlyTransactionError(e));
    }
  };

  if (editing && loadingExisting) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }
  if (editing && !existing) {
    return (
      <Screen withHeader>
        <Text>Não encontramos esse lançamento. Ele pode ter sido excluído.</Text>
        <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const accountOptions = activeAccounts.map((a) => ({ value: a.id, label: a.name }));
  const canTransfer = activeAccounts.length >= 2;

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: editing ? 'Editar lançamento' : 'Novo lançamento' }} />

      {editing ? null : (
        <SegmentedControl
          label="Tipo de lançamento"
          options={KIND_OPTIONS}
          value={kind}
          onChange={changeKind}
        />
      )}

      <Card>
        <MoneyInput label="Quanto foi?" valueCents={amount} onChangeCents={setAmount} />
      </Card>

      {kind === 'transfer' ? (
        canTransfer ? (
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Text variant="caption">De</Text>
              <SegmentedControl
                label="Conta de origem"
                options={accountOptions}
                value={accountId ?? ''}
                onChange={(id) => {
                  setAccountId(id);
                  if (id === toAccountId) setToAccountId(null);
                }}
              />
            </View>
            <View style={{ gap: spacing.xs }}>
              <Text variant="caption">Para</Text>
              <SegmentedControl
                label="Conta de destino"
                options={accountOptions.filter((o) => o.value !== accountId)}
                value={toAccountId ?? ''}
                onChange={setToAccountId}
              />
            </View>
          </View>
        ) : (
          <Card>
            <Text>Para transferir, você precisa de pelo menos duas contas.</Text>
            <Button
              label="Criar outra conta"
              variant="secondary"
              onPress={() => router.push('/perfil/conta-form')}
            />
          </Card>
        )
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption">Categoria</Text>
          {visibleCategories.length > 0 ? (
            <CategoryPicker
              categories={visibleCategories}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />
          ) : (
            <Text tone="textMuted">Nenhuma categoria ativa. Crie uma em Perfil, Categorias.</Text>
          )}
        </View>
      )}

      {kind !== 'transfer' && accountOptions.length > 1 ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="caption">Conta</Text>
          <SegmentedControl
            label="Conta"
            options={accountOptions}
            value={accountId ?? ''}
            onChange={setAccountId}
          />
        </View>
      ) : null}

      <DateField key={loaded ? 'loaded' : 'initial'} value={date} onChange={setDate} />

      <TextField
        label="Descrição (opcional)"
        value={description}
        onChangeText={setDescription}
        maxLength={120}
        placeholder="Ex.: Almoço com a equipe"
      />

      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Button label={busy ? 'Salvando…' : 'Salvar'} onPress={save} disabled={busy} />
      {editing ? (
        <Button label="Excluir lançamento" variant="secondary" onPress={remove} disabled={busy} />
      ) : null}
    </Screen>
  );
}
