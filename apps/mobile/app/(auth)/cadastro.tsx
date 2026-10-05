import { validateDisplayName, validateEmail, validatePassword } from '@lumioup/core';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button, Card, Screen, TextField } from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { useTheme } from '../../src/theme';

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
      <Screen title="Quase lá!">
        <Card>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>
            Enviamos um link de confirmação para {email.trim()}. Abra o e-mail e volte para entrar.
          </Text>
        </Card>
        <Link
          href="/(auth)/login"
          style={{ color: colors.primary, textAlign: 'center', padding: 12 }}
        >
          Ir para o login
        </Link>
      </Screen>
    );
  }

  return (
    <Screen title="Criar conta">
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
        <Text style={{ color: colors.textMuted, lineHeight: 22 }}>
          O LumioUP tem finalidade educacional e de organização financeira. Não oferecemos
          recomendação de compra ou venda de investimentos. Você lança seus dados manualmente e eles
          não aparecem para outras pessoas.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Switch
            accessibilityLabel="Aceito os termos e a política de privacidade"
            value={accepted}
            onValueChange={setAccepted}
          />
          <Text style={{ color: colors.text, flex: 1 }}>
            Aceito os termos e a política de privacidade
          </Text>
        </View>
      </Card>
      {formError ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.danger }}>
          {formError}
        </Text>
      ) : null}
      <Button label={busy ? 'Criando…' : 'Criar conta'} onPress={submit} disabled={busy} />
      <Link
        href="/(auth)/login"
        style={{ color: colors.primary, textAlign: 'center', padding: 12 }}
      >
        Já tenho conta
      </Link>
    </Screen>
  );
}
