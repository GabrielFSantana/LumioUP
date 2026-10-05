import { addDays, formatBrDate, parseBrDate, toDateString, type DateString } from '@lumioup/core';
import { useState } from 'react';
import { View } from 'react-native';
import { spacing } from '../../theme';
import { SegmentedControl } from './SegmentedControl';
import { Text } from './Text';
import { TextField } from './TextField';

type Mode = 'today' | 'yesterday' | 'other';

interface DateFieldProps {
  /** Data atual do campo (YYYY-MM-DD) ou null quando o texto digitado é inválido. */
  value: DateString | null;
  /** Recebe null enquanto o texto digitado não for uma data válida. */
  onChange: (date: DateString | null) => void;
  label?: string;
}

const OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'other', label: 'Outra data' },
] as const;

/** Atalhos "Hoje" e "Ontem" mais digitação dd/mm/aaaa, sem seletor nativo. */
export function DateField({ value, onChange, label = 'Data' }: DateFieldProps) {
  const today = toDateString(new Date());
  const initialMode: Mode =
    value === today ? 'today' : value === addDays(today, -1) ? 'yesterday' : 'other';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState(value ? formatBrDate(value) : '');
  const [error, setError] = useState<string | null>(null);

  const pick = (next: Mode) => {
    setMode(next);
    setError(null);
    if (next === 'today') onChange(today);
    else if (next === 'yesterday') onChange(addDays(today, -1));
    else setText(value ? formatBrDate(value) : '');
  };

  const edit = (input: string) => {
    setText(input);
    const parsed = parseBrDate(input);
    if (parsed) {
      setError(null);
      onChange(parsed);
    } else {
      setError('Use o formato dd/mm/aaaa, com uma data que exista.');
      onChange(null);
    }
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption">{label}</Text>
      <SegmentedControl label={label} options={OPTIONS} value={mode} onChange={pick} />
      {mode === 'other' ? (
        <TextField
          label="Data (dd/mm/aaaa)"
          value={text}
          onChangeText={edit}
          error={error}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      ) : null}
    </View>
  );
}
