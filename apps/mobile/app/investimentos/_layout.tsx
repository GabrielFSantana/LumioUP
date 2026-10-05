import { Stack } from 'expo-router';
import { fonts, useTheme } from '../../src/theme';

export default function InvestimentosLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Investimentos' }} />
      <Stack.Screen name="posicao" options={{ title: 'Posição' }} />
      <Stack.Screen name="posicao-form" options={{ title: 'Posição' }} />
    </Stack>
  );
}
