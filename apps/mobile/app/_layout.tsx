import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { Text, ToastProvider } from '../src/components/ui';
import { AuthProvider, useAuth } from '../src/features/auth/AuthProvider';
import { LevelUpOverlay } from '../src/features/gamification/LevelUpOverlay';
import { XpWatcher } from '../src/features/gamification/XpWatcher';
import { queryClient } from '../src/lib/queryClient';
import { isSupabaseConfigured } from '../src/lib/supabase';
import { fonts, useTheme } from '../src/theme';

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
  const { colors } = useTheme();
  if (loading) return <Splash />;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={Boolean(session)}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="investimentos" />
          <Stack.Screen name="relatorios" />
          <Stack.Screen name="meta" />
          <Stack.Screen name="xp" />
          <Stack.Screen name="clube" />
          <Stack.Screen
            name="lancamento-form"
            options={{
              presentation: 'modal',
              headerShown: true,
              title: 'Lançamento',
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: fonts.display, fontSize: 20 },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
      {session ? (
        <>
          <XpWatcher />
          <LevelUpOverlay />
        </>
      ) : null}
    </View>
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
