import { validateEmail } from '@lumioup/core';
import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Mascot, Screen, Text, TextField } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { fonts, useTheme } from '../../src/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const err = validateEmail(email);
    setEmailError(err);
    setFormError(null);
    if (err) return;
    if (password === '') return setFormError('Informe sua senha.');
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) setFormError(result.message);
    // Em caso de sucesso, a proteção de rotas leva para o app.
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <Mascot size={110} mood="cheer" />
        <Text variant="display">Entrar</Text>
        <Text tone="textMuted" style={{ textAlign: 'center' }}>
          Acenda a luz do seu controle financeiro.
        </Text>
      </View>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        error={emailError}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
      <TextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        onSubmitEditing={submit}
      />
      {formError ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {formError}
        </Text>
      ) : null}
      <Button label={busy ? 'Entrando…' : 'Entrar'} onPress={submit} disabled={busy} />
      <Link
        href="/(auth)/cadastro"
        style={{ color: colors.text, fontFamily: fonts.bodyBold, textAlign: 'center', padding: 12 }}
      >
        Ainda não tenho conta
      </Link>
    </Screen>
  );
}
