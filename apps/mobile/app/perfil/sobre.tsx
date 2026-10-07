import Constants from 'expo-constants';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Mascot, Screen, Text } from '../../src/components/ui';
import { CREDITS } from '../../src/config/credits';
import { spacing } from '../../src/theme';

export default function SobreScreen() {
  const version = Constants.expoConfig?.version ?? '';

  return (
    <Screen withHeader>
      <Card>
        <View style={styles.center}>
          <Mascot size={96} label="Lumi, o mascote do LumioUP" />
          <Text variant="title">LumioUP</Text>
          <Text tone="textMuted" style={styles.centerText}>
            {CREDITS.tagline}
          </Text>
          {version ? <Chip label={`Versão ${version}`} /> : null}
        </View>
      </Card>

      <Card>
        <Text variant="heading">Desenvolvido por</Text>
        <Text variant="title">{CREDITS.developer.name}</Text>
        <Text tone="textMuted">{CREDITS.developer.role}</Text>
        <Button
          label="Ver perfil no GitHub"
          variant="secondary"
          onPress={() => void Linking.openURL(CREDITS.developer.github)}
        />
        <Button
          label="Ver o código do app"
          variant="secondary"
          onPress={() => void Linking.openURL(CREDITS.repository)}
        />
        {CREDITS.assistedBy ? <Text variant="caption">{CREDITS.assistedBy}</Text> : null}
      </Card>

      <Card>
        <Text variant="heading">Feito com</Text>
        {CREDITS.builtWith.map((item) => (
          <View key={item.name} style={{ gap: 2 }}>
            <Text variant="bodyBold">{item.name}</Text>
            <Text variant="caption">{item.note}</Text>
          </View>
        ))}
      </Card>

      <Text variant="caption" style={styles.centerText}>
        O LumioUP é educativo e organizacional. Não é instituição financeira e não faz recomendação
        de investimentos.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  centerText: { textAlign: 'center' },
});
