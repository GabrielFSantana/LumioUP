import { Stack } from 'expo-router';
import { fonts, useTheme } from '../../src/theme';

export default function PerfilLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 20 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Perfil' }} />
      <Stack.Screen name="categorias" options={{ title: 'Categorias' }} />
      <Stack.Screen name="categoria-form" options={{ title: 'Categoria' }} />
      <Stack.Screen name="contas" options={{ title: 'Contas' }} />
      <Stack.Screen name="conta-form" options={{ title: 'Conta' }} />
      <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
      <Stack.Screen name="privacidade" options={{ title: 'Privacidade e dados' }} />
    </Stack>
  );
}
