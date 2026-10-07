import { useRouter } from 'expo-router';
import { Switch, View } from 'react-native';
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
import { usePrivacySettings, useSetShowInClubRanking } from '../../src/features/settings/privacy';
import { useTheme } from '../../src/theme';

export default function PerfilScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const name = String(session?.user.user_metadata?.display_name ?? '').trim();
  const { colors } = useTheme();
  const { data: privacy } = usePrivacySettings();
  const setRanking = useSetShowInClubRanking();
  const showInRanking = privacy?.showInClubRanking ?? true;

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

      <MenuRow
        title="Notificações"
        subtitle="Lembretes só quando você quiser"
        leading={<CategoryBadge icon="notifications-outline" color="pink" />}
        onPress={() => router.push('/perfil/notificacoes')}
      />

      <MenuRow
        title="Privacidade e dados"
        subtitle="Exportar meus dados e excluir a conta"
        leading={<CategoryBadge icon="shield-checkmark-outline" color="slate" />}
        onPress={() => router.push('/perfil/privacidade')}
      />

      <Card>
        <Text variant="heading">Privacidade nos clubes</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Switch
            accessibilityLabel="Aparecer no ranking dos clubes"
            value={showInRanking}
            onValueChange={(value) => setRanking.mutate(value)}
            trackColor={{ true: colors.primaryEdge, false: colors.border }}
            thumbColor={showInRanking ? colors.primary : colors.surface}
          />
          <Text variant="bodyBold" style={{ flex: 1 }}>
            Aparecer no ranking dos clubes
          </Text>
        </View>
        <Text variant="caption">
          {showInRanking
            ? 'Os membros dos seus clubes veem seu nível, XP e sequência. Valores em reais nunca são compartilhados.'
            : 'Você continua nos clubes, mas seu nível, XP e sequência ficam escondidos dos outros membros.'}
        </Text>
      </Card>

      <MenuRow
        title="Sobre o LumioUP"
        subtitle="Créditos e quem desenvolveu o app"
        leading={<CategoryBadge icon="information-circle-outline" color="sand" />}
        onPress={() => router.push('/perfil/sobre')}
      />

      <Button label="Sair" variant="secondary" onPress={signOut} />
    </Screen>
  );
}
