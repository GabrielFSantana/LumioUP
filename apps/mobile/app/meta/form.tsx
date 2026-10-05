import {
  GOAL_KIND_HINTS,
  GOAL_KIND_LABELS,
  addDays,
  formatBrDate,
  isMonthlyGoal,
  parseBrDate,
  toDateString,
  validateGoalInput,
  type DateString,
  type GoalKind,
} from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  MoneyInput,
  Screen,
  SegmentedControl,
  Text,
  TextField,
} from '../../src/components/ui';
import { useCategories } from '../../src/features/catalog/hooks';
import { friendlyGoalError } from '../../src/features/goals/api';
import { useCreateGoal, useGoals, useUpdateGoal } from '../../src/features/goals/hooks';
import { GOAL_DEFAULT_NAMES } from '../../src/features/goals/visuals';
import { CategoryPicker } from '../../src/features/transactions/CategoryPicker';
import { spacing } from '../../src/theme';

type DeadlineOption = 'none' | '30' | '90' | '180' | '365' | 'custom';

const KIND_OPTIONS = (Object.keys(GOAL_KIND_LABELS) as GoalKind[]).map((value) => ({
  value,
  label: GOAL_KIND_LABELS[value],
}));

const DEADLINE_OPTIONS = [
  { value: 'none', label: 'Sem prazo' },
  { value: '30', label: '1 mês' },
  { value: '90', label: '3 meses' },
  { value: '180', label: '6 meses' },
  { value: '365', label: '1 ano' },
  { value: 'custom', label: 'Outra data' },
] as const;

const TARGET_LABELS: Record<GoalKind, string> = {
  emergency: 'Valor da meta',
  save: 'Valor da meta',
  debt: 'Valor da dívida',
  trip: 'Valor da meta',
  purchase: 'Valor da meta',
  invest_monthly: 'Quanto investir por mês',
  spending_limit: 'Limite por mês',
};

export default function MetaFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editing = Boolean(params.id);
  const today = toDateString(new Date());

  const { data: goals } = useGoals();
  const { data: categories } = useCategories();
  const existing = params.id ? goals?.find((g) => g.id === params.id) : undefined;

  const [kind, setKind] = useState<GoalKind>('save');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [target, setTarget] = useState(0);
  const [deadlineOption, setDeadlineOption] = useState<DeadlineOption>('none');
  const [customText, setCustomText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (existing && !loaded) {
      setKind(existing.kind);
      setName(existing.name);
      setNameTouched(true);
      setTarget(existing.targetCents);
      setCategoryId(existing.expenseCategoryId);
      if (existing.deadline) {
        setDeadlineOption('custom');
        setCustomText(formatBrDate(existing.deadline));
      }
      setLoaded(true);
    }
  }, [existing, loaded]);

  const create = useCreateGoal();
  const update = useUpdateGoal();
  const busy = create.isPending || update.isPending;
  const monthly = isMonthlyGoal(kind);

  const changeKind = (next: GoalKind) => {
    setKind(next);
    setError(null);
    if (isMonthlyGoal(next)) setDeadlineOption('none');
    if (next !== 'spending_limit') setCategoryId(null);
    if (!nameTouched) setName('');
  };

  const resolveDeadline = (): DateString | null | undefined => {
    if (monthly || deadlineOption === 'none') return null;
    if (deadlineOption === 'custom') return parseBrDate(customText) ?? undefined;
    return addDays(today, Number(deadlineOption));
  };

  const save = async () => {
    setError(null);
    const deadline = resolveDeadline();
    if (deadline === undefined)
      return setError('Use o formato dd/mm/aaaa, com uma data que exista.');
    const finalName = name.trim() === '' ? GOAL_DEFAULT_NAMES[kind] : name;
    const input = {
      kind,
      name: finalName,
      targetCents: target,
      deadline,
      expenseCategoryId: kind === 'spending_limit' ? categoryId : null,
    };
    const problem = validateGoalInput(input, today);
    if (problem) return setError(problem);
    try {
      if (editing && params.id) {
        await update.mutateAsync({
          id: params.id,
          name: finalName,
          targetCents: target,
          ...(monthly ? {} : { deadline }),
        });
      } else {
        await create.mutateAsync(input);
      }
      router.back();
    } catch (e) {
      setError(friendlyGoalError(e));
    }
  };

  if (editing && !existing) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }

  const expenseCategories = (categories ?? []).filter((c) => c.kind === 'expense' && !c.isArchived);
  const lockedCategory = (categories ?? []).find((c) => c.id === categoryId);

  return (
    <Screen withHeader>
      {editing ? (
        <Chip label={GOAL_KIND_LABELS[kind]} />
      ) : (
        <View style={{ gap: spacing.xs }}>
          <Text variant="caption">Tipo de meta</Text>
          <SegmentedControl
            label="Tipo de meta"
            options={KIND_OPTIONS}
            value={kind}
            onChange={changeKind}
          />
          <Text variant="caption">{GOAL_KIND_HINTS[kind]}</Text>
        </View>
      )}

      <TextField
        label="Nome da meta"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setNameTouched(true);
          setError(null);
        }}
        placeholder={GOAL_DEFAULT_NAMES[kind]}
        maxLength={60}
      />

      <Card>
        <MoneyInput label={TARGET_LABELS[kind]} valueCents={target} onChangeCents={setTarget} />
      </Card>

      {kind === 'spending_limit' ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="caption">Categoria de gasto</Text>
          {editing ? (
            <Chip label={lockedCategory?.name ?? 'Categoria'} />
          ) : (
            <CategoryPicker
              categories={expenseCategories}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />
          )}
        </View>
      ) : null}

      {monthly ? (
        <Text variant="caption">Esta meta se renova todo mês, então não tem prazo.</Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          <Text variant="caption">Prazo (opcional)</Text>
          <SegmentedControl
            label="Prazo da meta"
            options={DEADLINE_OPTIONS}
            value={deadlineOption}
            onChange={(next) => {
              setDeadlineOption(next);
              setError(null);
            }}
          />
          {deadlineOption === 'custom' ? (
            <TextField
              label="Data (dd/mm/aaaa)"
              value={customText}
              onChangeText={(text) => {
                setCustomText(text);
                setError(null);
              }}
              maxLength={10}
              keyboardType="numbers-and-punctuation"
            />
          ) : null}
        </View>
      )}

      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Button label={busy ? 'Salvando…' : 'Salvar'} onPress={save} disabled={busy} />
    </Screen>
  );
}
