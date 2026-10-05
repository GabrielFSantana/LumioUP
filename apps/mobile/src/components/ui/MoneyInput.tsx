import { StyleSheet, Text, TextInput, View } from 'react-native';
import { formatBRL } from '@lumioup/core';
import { minTouch, radius, spacing, useTheme } from '../../theme';

interface MoneyInputProps {
  /** Valor em centavos. */
  valueCents: number;
  onChangeCents: (cents: number) => void;
  label: string;
}

const MAX_DIGITS = 11; // até R$ 999.999.999,99

/** Entrada estilo caixa registradora: o usuário digita só números e os centavos "empurram". */
export function MoneyInput({ valueCents, onChangeCents, label }: MoneyInputProps) {
  const { colors } = useTheme();
  const handleChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, MAX_DIGITS);
    onChangeCents(digits === '' ? 0 : Number(digits));
  };
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        value={formatBRL(valueCents)}
        onChangeText={handleChange}
        style={[
          styles.input,
          { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { fontSize: 14 },
  input: {
    minHeight: minTouch + 8,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 28,
    fontWeight: '700',
  },
});
