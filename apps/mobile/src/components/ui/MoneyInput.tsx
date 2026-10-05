import { StyleSheet, TextInput, View } from 'react-native';
import { formatBRL } from '@lumioup/core';
import { fonts, spacing, useTheme } from '../../theme';
import { Text } from './Text';

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
      <Text variant="caption">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        value={formatBRL(valueCents)}
        onChangeText={handleChange}
        style={[styles.input, { color: colors.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  input: {
    fontFamily: fonts.display,
    fontSize: 44,
    textAlign: 'center',
    alignSelf: 'stretch',
    outlineWidth: 0,
  },
});
