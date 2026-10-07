import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '../../src/components/ui/TabBar';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; label: string; icon: IconName }[] = [
  { name: 'index', title: 'Início', label: 'Início', icon: 'home-outline' },
  { name: 'lancamentos', title: 'Lançamentos', label: 'Lançar', icon: 'swap-vertical-outline' },
  { name: 'metas', title: 'Metas', label: 'Metas', icon: 'flag-outline' },
  { name: 'clubes', title: 'Clubes', label: 'Clubes', icon: 'people-outline' },
  { name: 'aprender', title: 'Aprender', label: 'Aprender', icon: 'school-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
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
