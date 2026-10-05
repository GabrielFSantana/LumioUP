import {
  INVESTMENT_KIND_LABELS,
  categoryKindFor,
  formatBRL,
  isInvestmentKind,
  summarizeHoldings,
  toDateString,
  validateInvestmentMove,
  validateTransaction,
  type DateString,
  type InvestmentKind,
  type Transaction,
  type TransactionKind,
} from '@lumioup/core';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { useHoldings } from '../src/features/investments/hooks';
import { friendlyTransactionError } from '../src/features/transactions/api';
import { CategoryPicker } from '../src/features/transactions/CategoryPicker';
import {
  useCreateTransaction,
  useInvestmentTransactions,
  useSetTransactionDeleted,
  useTransaction,
  useUpdateTransaction,
} from '../src/features/transactions/hooks';
import { spacing } from '../src/theme';

type Group = 'expense' | 'income' | 'transfer' | 'investing';
type FormKind = Extract<TransactionKind, 'expense' | 'income' | 'transfer' | InvestmentKind>;

const GROUP_OPTIONS = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Receita' },
  { value: 'transfer', label: 'Transf.' },
  { value: 'investing', label: 'Invest.' },
] as const;

const INVESTING_OPTIONS = (Object.keys(INVESTMENT_KIND_LABELS) as InvestmentKind[]).map(
  (value) => ({ value, label: INVESTMENT_KIND_LABELS[value] }),
);

const FORM_KINDS: readonly string[] = [
  'expense',
  'income',
  'transfer',
  'investment',
  'redemption',
  'profit',
  'loss',
];

const groupOf = (kind: FormKind): Group => (isInvestmentKind(kind) ? 'investing' : (kind as Group));

export default function LancamentoFormScreen() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string; kind?: string; holdingId?: string }>();
  const editing = Boolean(params.id);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: holdings } = useHoldings();
  const { data: investmentTransactions } = useInvestmentTransactions();
  const { data: existing, isLoading: loadingExisting } = useTransaction(params.id);

  const initialKind: FormKind = FORM_KINDS.includes(params.kind ?? '')
    ? (params.kind as FormKind)
    : 'expense';
  const [kind, setKind] = useState<FormKind>(initialKind);
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [holdingId, setHoldingId] = useState<string | null>(params.holdingId ?? null);
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

  const group = groupOf(kind);
  const investing = group === 'investing';
  const movesCash = kind !== 'profit' && kind !== 'loss';

  const activeAccounts = (accounts ?? []).filter(
    (a) => !a.isArchived || a.id === existing?.accountId || a.id === existing?.toAccountId,
  );
  const wantedCategoryKind = categoryKindFor(kind);
  const visibleCategories = (categories ?? []).filter(
    (c) => c.kind === wantedCategoryKind && (!c.isArchived || c.id === existing?.categoryId),
  );
  const activeHoldings = (holdings ?? []).filter(
    (h) => !h.isArchived || h.id === existing?.holdingId,
  );

  // Valor atual da posição escolhida, sem contar o próprio lançamento em edição.
  const holdingValue = useMemo(() => {
    if (!holdingId) return 0;
    const others = (investmentTransactions ?? []).filter((t) => t.id !== params.id);
    return summarizeHoldings(others as Transaction[]).get(holdingId)?.currentValue ?? 0;
  }, [holdingId, investmentTransactions, params.id]);

  // Edição: preenche o formulário uma única vez quando o lançamento carregar.
  useEffect(() => {
    if (existing && !loaded) {
      if (FORM_KINDS.includes(existing.kind)) setKind(existing.kind as FormKind);
      setAmount(existing.amountCents);
      setCategoryId(existing.categoryId);
      setHoldingId(existing.holdingId);
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

  const changeGroup = (next: Group) => {
    setKind(next === 'investing' ? 'investment' : next);
    setCategoryId(null);
    setToAccountId(null);
    setError(null);
  };

  const save = async () => {
    setError(null);
    if (date === null) return setError('Informe uma data válida.');
    if (amount <= 0) return setError('Informe um valor maior que zero.');
    if (movesCash && !accountId) return setError('Escolha a conta.');
    if (!investing && kind !== 'transfer' && !categoryId) return setError('Escolha uma categoria.');
    if (investing && !holdingId) return setError('Escolha a posição de investimento.');
    const problems = validateTransaction({
      kind,
      amountCents: amount,
      occurredOn: date,
      accountId: movesCash ? accountId : null,
      toAccountId: kind === 'transfer' ? toAccountId : null,
      categoryId: kind === 'expense' || kind === 'income' ? categoryId : null,
      holdingId: investing ? holdingId : null,
    });
    if (problems.length > 0) return setError(problems[0] ?? 'Confira os dados.');
    if (investing) {
      const moveProblem = validateInvestmentMove(kind, amount, holdingValue);
      if (moveProblem) return setError(moveProblem);
    }

    const input = {
      kind,
      amountCents: amount,
      occurredOn: date,
      accountId: movesCash ? accountId : null,
      toAccountId: kind === 'transfer' ? toAccountId : null,
      categoryId: kind === 'expense' || kind === 'income' ? categoryId : null,
      holdingId: investing ? holdingId : null,
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
  const holdingOptions = activeHoldings.map((h) => ({ value: h.id, label: h.name }));

  return (
    <Screen withHeader>
      <Stack.Screen options={{ title: editing ? 'Editar lançamento' : 'Novo lançamento' }} />

      {editing ? null : (
        <SegmentedControl
          label="Tipo de lançamento"
          options={GROUP_OPTIONS}
          value={group}
          onChange={changeGroup}
        />
      )}
      {investing && !editing ? (
        <SegmentedControl
          label="Tipo de movimento de investimento"
          options={INVESTING_OPTIONS}
          value={kind as InvestmentKind}
          onChange={(next) => {
            setKind(next);
            setError(null);
          }}
        />
      ) : null}

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
      ) : investing ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption">Posição</Text>
          {holdingOptions.length > 0 ? (
            <>
              <SegmentedControl
                label="Posição de investimento"
                options={holdingOptions}
                value={holdingId ?? ''}
                onChange={(id) => {
                  setHoldingId(id);
                  setError(null);
                }}
              />
              {holdingId ? (
                <Text variant="caption">Valor atual da posição: {formatBRL(holdingValue)}</Text>
              ) : null}
            </>
          ) : (
            <Card>
              <Text>Crie uma posição (por exemplo, Tesouro Selic) para registrar movimentos.</Text>
              <Button
                label="Criar posição"
                variant="secondary"
                onPress={() => router.push('/investimentos/posicao-form')}
              />
            </Card>
          )}
        </View>
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

      {kind !== 'transfer' && movesCash && accountOptions.length > 1 ? (
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

      {investing && !movesCash ? (
        <Text variant="caption">
          Lucro e perda mudam o valor da posição, mas não movem dinheiro das suas contas.
        </Text>
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
