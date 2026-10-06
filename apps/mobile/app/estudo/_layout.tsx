import { Stack } from 'expo-router';
import { fonts, useTheme } from '../../src/theme';

export default function EstudoLayout() {
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
      <Stack.Screen name="artigo" options={{ title: 'Artigo' }} />
      <Stack.Screen name="quiz" options={{ title: 'Quiz' }} />
      <Stack.Screen name="glossario" options={{ title: 'Glossário' }} />
    </Stack>
  );
}
