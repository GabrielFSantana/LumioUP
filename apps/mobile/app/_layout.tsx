import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/features/auth/AuthProvider';
import { isSupabaseConfigured } from '../src/lib/supabase';
import { useTheme } from '../src/theme';

function RootNavigator() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { colors } = useTheme();
  if (!isSupabaseConfigured) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 8 }}>
          Configuração pendente
        </Text>
        <Text style={{ color: colors.textMuted, lineHeight: 22 }}>
          Copie .env.example para apps/mobile/.env e preencha EXPO_PUBLIC_SUPABASE_URL e
          EXPO_PUBLIC_SUPABASE_ANON_KEY. Depois reinicie o app.
        </Text>
      </View>
    );
  }
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <RootNavigator />
    </AuthProvider>
  );
}
