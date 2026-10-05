import { Stack } from 'expo-router';
import { fonts, useTheme } from '../../src/theme';

export default function MetaLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Meta' }} />
      <Stack.Screen name="form" options={{ title: 'Meta' }} />
      <Stack.Screen name="contribuicao" options={{ title: 'Contribuição' }} />
    </Stack>
  );
}
