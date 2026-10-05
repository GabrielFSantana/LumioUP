import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '../src/components/ui';
import { AuthProvider, useAuth } from '../src/features/auth/AuthProvider';
import { isSupabaseConfigured } from '../src/lib/supabase';
import { useTheme } from '../src/theme';

function Splash() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator color={colors.primaryEdge} />
    </View>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  if (loading) return <Splash />;

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
  // Se as fontes falharem, o app segue com a fonte do sistema em vez de travar.
  const [fontsLoaded, fontError] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  if (!fontsLoaded && !fontError) return <Splash />;

  if (!isSupabaseConfigured) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: 24,
          gap: 8,
          backgroundColor: colors.background,
        }}
      >
        <Text variant="title">Configuração pendente</Text>
        <Text tone="textMuted">
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
