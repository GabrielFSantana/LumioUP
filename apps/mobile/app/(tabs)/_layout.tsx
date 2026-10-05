import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { fonts, radius, spacing, useTheme } from '../../src/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; label: string; icon: IconName }[] = [
  { name: 'index', title: 'Início', label: 'Início', icon: 'home-outline' },
  { name: 'lancamentos', title: 'Lançamentos', label: 'Lançar', icon: 'swap-vertical-outline' },
  { name: 'metas', title: 'Metas', label: 'Metas', icon: 'flag-outline' },
  { name: 'clubes', title: 'Clubes', label: 'Clubes', icon: 'people-outline' },
  { name: 'aprender', title: 'Aprender', label: 'Aprender', icon: 'school-outline' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarActiveBackgroundColor: colors.primarySoft,
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        tabBarItemStyle: {
          borderRadius: radius.md,
          marginVertical: spacing.xs,
          marginHorizontal: 2,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 2,
          height: Platform.OS === 'web' ? 68 : undefined,
          paddingHorizontal: spacing.xs,
        },
      }}
    >
      {TABS.map(({ name, title, label, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarLabel: label,
            tabBarIcon: ({ color, size }) => <Ionicons name={icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
