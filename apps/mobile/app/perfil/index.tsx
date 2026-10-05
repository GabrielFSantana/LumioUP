import { useRouter } from 'expo-router';
import { View } from 'react-native';
import {
  Button,
  Card,
  CategoryBadge,
  Mascot,
  MenuRow,
  Screen,
  Text,
} from '../../src/components/ui';
import { useAuth } from '../../src/features/auth/AuthProvider';

export default function PerfilScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const name = String(session?.user.user_metadata?.display_name ?? '').trim();

  return (
    <Screen withHeader>
      <Card>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Mascot size={88} />
          <Text variant="title">{name || 'Você'}</Text>
          <Text variant="caption">{session?.user.email}</Text>
        </View>
      </Card>

      <MenuRow
        title="Categorias"
        subtitle="Gastos, receitas e investimentos"
        leading={<CategoryBadge icon="pricetags-outline" color="amber" />}
        onPress={() => router.push('/perfil/categorias')}
      />
      <MenuRow
        title="Contas"
        subtitle="Carteira, banco e outras"
        leading={<CategoryBadge icon="wallet-outline" color="teal" />}
        onPress={() => router.push('/perfil/contas')}
      />

      <Button label="Sair" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
