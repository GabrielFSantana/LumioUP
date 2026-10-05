import { validateDisplayName, validateEmail, validatePassword } from '@lumioup/core';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Button, Card, Mascot, Screen, Text, TextField } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { fonts, useTheme } from '../../src/theme';

export default function CadastroScreen() {
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string | null;
    email?: string | null;
    password?: string | null;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  const linkStyle = {
    color: colors.text,
    fontFamily: fonts.bodyBold,
    textAlign: 'center' as const,
    padding: 12,
  };

  const submit = async () => {
    const next = {
      name: validateDisplayName(name),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(next);
    setFormError(null);
    if (next.name || next.email || next.password) return;
    if (!accepted)
      return setFormError('Para continuar, aceite os termos e a política de privacidade.');
    setBusy(true);
    const result = await signUp({ email, password, displayName: name });
    setBusy(false);
    if (!result.ok) return setFormError(result.message);
    if (result.needsEmailConfirmation) setConfirmEmail(true);
    // Sem confirmação de e-mail, a sessão já existe e a proteção de rotas leva para o app.
  };

  if (confirmEmail) {
    return (
      <Screen>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Mascot size={110} mood="cheer" />
          <Text variant="display">Quase lá!</Text>
        </View>
        <Card>
          <Text>
            Enviamos um link de confirmação para {email.trim()}. Abra o e-mail e volte para entrar.
          </Text>
        </Card>
        <Link href="/(auth)/login" style={linkStyle}>
          Ir para o login
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
        <Mascot size={96} />
        <Text variant="display">Criar conta</Text>
        <Text tone="textMuted" style={{ textAlign: 'center' }}>
          Em poucos segundos você começa a acender sua jornada.
        </Text>
      </View>
      <TextField
        label="Como podemos te chamar?"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoComplete="name"
      />
      <TextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
      />
      <TextField
        label="Senha (8+ caracteres, com letras e números)"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoComplete="new-password"
      />
      <Card>
        <Text variant="caption" style={{ lineHeight: 20 }}>
          O LumioUP tem finalidade educacional e de organização financeira. Não oferecemos
          recomendação de compra ou venda de investimentos. Você lança seus dados manualmente e eles
          não aparecem para outras pessoas.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Switch
            accessibilityLabel="Aceito os termos e a política de privacidade"
            value={accepted}
            onValueChange={setAccepted}
            trackColor={{ true: colors.primaryEdge, false: colors.border }}
            thumbColor={accepted ? colors.primary : colors.surface}
          />
          <Text variant="bodyBold" style={{ flex: 1 }}>
            Aceito os termos e a política de privacidade
          </Text>
        </View>
      </Card>
      {formError ? (
        <Text tone="danger" accessibilityLiveRegion="polite">
          {formError}
        </Text>
      ) : null}
      <Button label={busy ? 'Criando…' : 'Criar conta'} onPress={submit} disabled={busy} />
      <Link href="/(auth)/login" style={linkStyle}>
        Já tenho conta
      </Link>
    </Screen>
  );
}
