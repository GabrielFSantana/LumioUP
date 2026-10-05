import { formatBRL, toDateString, type DateString } from '@lumioup/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Button,
  Card,
  DateField,
  MoneyInput,
  Screen,
  Text,
  TextField,
} from '../../src/components/ui';
import { friendlyGoalError } from '../../src/features/goals/api';
import { useAddContribution, useGoalViews } from '../../src/features/goals/hooks';

export default function ContribuicaoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ goalId?: string; mode?: string }>();
  const withdraw = params.mode === 'withdraw';
  const { views } = useGoalViews();
  const view = views.find((v) => v.goal.id === params.goalId);

  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState<DateString | null>(toDateString(new Date()));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = useAddContribution();

  if (!view || !view.saving) {
    return (
      <Screen withHeader>
        <Text tone="textMuted">Carregando…</Text>
      </Screen>
    );
  }
  const saved = view.saving.currentCents;

  const save = async () => {
    setError(null);
    if (amount <= 0) return setError('Informe um valor maior que zero.');
    if (date === null) return setError('Informe uma data válida.');
    if (withdraw && amount > saved) {
      return setError(
        `Você só tem ${formatBRL(saved)} guardados nesta meta. Retire até esse valor.`,
      );
    }
    try {
      await add.mutateAsync({
        goalId: view.goal.id,
        amountCents: withdraw ? -amount : amount,
        occurredOn: date,
        note,
      });
      router.back();
    } catch (e) {
      setError(friendlyGoalError(e));
    }
  };

  return (
    <Screen withHeader>
      <Text variant="title">
        {withdraw ? 'Retirar de' : 'Guardar para'} {view.goal.name}
      </Text>
      <Card>
        <MoneyInput
          label={withdraw ? 'Quanto você retirou?' : 'Quanto você guardou?'}
          valueCents={amount}
          onChangeCents={setAmount}
        />
        <Text variant="caption" style={{ textAlign: 'center' }}>
          {`Já guardado: ${formatBRL(saved)}`}
        </Text>
      </Card>
      <DateField value={date} onChange={setDate} />
      <TextField
        label="Observação (opcional)"
        value={note}
        onChangeText={setNote}
        maxLength={200}
        placeholder="Ex.: 13º salário"
      />
      <Text variant="caption">
        Contribuições são marcações do quanto você já separou. Elas não movem dinheiro entre as suas
        contas.
      </Text>
      {error ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Button
        label={add.isPending ? 'Salvando…' : withdraw ? 'Registrar retirada' : 'Guardar'}
        onPress={save}
        disabled={add.isPending}
      />
    </Screen>
  );
}
