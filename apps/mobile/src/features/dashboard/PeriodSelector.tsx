import { Ionicons } from '@expo/vector-icons';
import {
  formatBrDate,
  formatPeriodLabel,
  parseBrDate,
  periodFor,
  shiftAnchor,
  toDateString,
  type DateString,
  type Period,
  type PeriodKind,
} from '@lumioup/core';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SegmentedControl, Text, TextField } from '../../components/ui';
import { minTouch, spacing, useTheme } from '../../theme';

export interface PeriodState {
  kind: PeriodKind;
  /** Data dentro do período (ignorada em `custom`). */
  anchor: DateString;
  /** Período do tipo personalizado, sempre válido quando presente. */
  custom: Period | null;
}

interface PeriodSelectorProps {
  state: PeriodState;
  onChange: (next: PeriodState) => void;
}

const OPTIONS = [
  { value: 'day', label: 'Dia' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'year', label: 'Ano' },
  { value: 'custom', label: 'Outro' },
] as const;

function ArrowButton({
  direction,
  onPress,
  disabled,
}: {
  direction: 'prev' | 'next';
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direction === 'prev' ? 'Período anterior' : 'Próximo período'}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.arrow, { opacity: disabled ? 0.3 : 1 }]}
    >
      <Ionicons
        name={direction === 'prev' ? 'chevron-back' : 'chevron-forward'}
        size={24}
        color={colors.text}
      />
    </Pressable>
  );
}

/** Filtro do painel: dia, semana, mês, ano ou período personalizado. */
export function PeriodSelector({ state, onChange }: PeriodSelectorProps) {
  const today = toDateString(new Date());
  const period = periodFor(state.kind, state.anchor, state.custom ?? undefined);
  const [fromText, setFromText] = useState(formatBrDate(period.from));
  const [toText, setToText] = useState(formatBrDate(period.to));
  const [error, setError] = useState<string | null>(null);

  const changeKind = (kind: PeriodKind) => {
    if (kind === 'custom') {
      setFromText(formatBrDate(period.from));
      setToText(formatBrDate(period.to));
      setError(null);
      onChange({ kind, anchor: state.anchor, custom: period });
    } else {
      onChange({ kind, anchor: state.kind === 'custom' ? period.to : state.anchor, custom: null });
    }
  };

  const editCustom = (fromValue: string, toValue: string) => {
    const from = parseBrDate(fromValue);
    const to = parseBrDate(toValue);
    if (!from || !to) return setError('Use o formato dd/mm/aaaa, com datas que existam.');
    if (from > to) return setError('A data inicial precisa ser anterior à final.');
    setError(null);
    onChange({ kind: 'custom', anchor: from, custom: { from, to } });
  };

  const step = (delta: number) =>
    onChange({ ...state, anchor: shiftAnchor(state.kind, state.anchor, delta) });
  const nextStart = periodFor(state.kind, shiftAnchor(state.kind, state.anchor, 1)).from;

  return (
    <View style={{ gap: spacing.sm }}>
      <SegmentedControl
        scrollable
        label="Período do painel"
        options={OPTIONS}
        value={state.kind}
        onChange={changeKind}
      />
      {state.kind === 'custom' ? (
        <View style={{ gap: spacing.sm }}>
          <View style={styles.dates}>
            <View style={{ flex: 1 }}>
              <TextField
                label="De (dd/mm/aaaa)"
                value={fromText}
                onChangeText={(text) => {
                  setFromText(text);
                  editCustom(text, toText);
                }}
                maxLength={10}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Até (dd/mm/aaaa)"
                value={toText}
                onChangeText={(text) => {
                  setToText(text);
                  editCustom(fromText, text);
                }}
                maxLength={10}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          {error ? (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.nav}>
          <ArrowButton direction="prev" onPress={() => step(-1)} />
          <Text variant="title" accessibilityRole="header">
            {formatPeriodLabel(state.kind, period, today)}
          </Text>
          <ArrowButton direction="next" onPress={() => step(1)} disabled={nextStart > today} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
  dates: { flexDirection: 'row', gap: spacing.sm },
});
