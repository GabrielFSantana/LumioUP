import {
  DAILY_TIME_OPTIONS,
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from '@lumioup/core';
import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { Card, Screen, SegmentedControl, Text, useToast } from '../../src/components/ui';
import {
  useNotificationPrefs,
  useSetNotificationPrefs,
} from '../../src/features/notifications/prefs';
import {
  getPermission,
  notificationsSupported,
  requestPermission,
  type PermissionState,
} from '../../src/features/notifications/scheduler';
import { spacing, useTheme } from '../../src/theme';

type ToggleKey = Exclude<keyof NotificationPrefs, 'dailyTime'>;

const OPTIONS: { key: ToggleKey; title: string; hint: string }[] = [
  {
    key: 'dailyReminder',
    title: 'Lembrete para registrar',
    hint: 'Um aviso por dia, no horário que você escolher. Não toca se você já registrou algo hoje.',
  },
  {
    key: 'missions',
    title: 'Missões do dia',
    hint: 'Um aviso às 09:00 dizendo que há missões novas.',
  },
  {
    key: 'weeklyReview',
    title: 'Revisão da semana',
    hint: 'Aos domingos, às 18:00, para olhar o resumo da semana.',
  },
  {
    key: 'goalDeadlines',
    title: 'Metas perto do prazo',
    hint: 'Um aviso 3 dias antes do prazo de cada meta.',
  },
  {
    key: 'monthlySummary',
    title: 'Evolução do mês',
    hint: 'No dia 1º de cada mês, às 09:00, para ver como foi o mês.',
  },
];

export default function NotificacoesScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const { data } = useNotificationPrefs();
  const save = useSetNotificationPrefs();
  const prefs = data ?? DEFAULT_NOTIFICATION_PREFS;
  const [permission, setPermission] = useState<PermissionState>('unsupported');

  useEffect(() => {
    void getPermission().then(setPermission);
  }, []);

  const toggle = async (key: ToggleKey, value: boolean) => {
    if (value && notificationsSupported && permission !== 'granted') {
      const result = await requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        toast.show({
          message:
            result === 'denied'
              ? 'Ative as notificações do LumioUP nas configurações do celular.'
              : 'Sem a permissão não dá para enviar os lembretes.',
        });
        return;
      }
    }
    save.mutate({ [key]: value });
  };

  return (
    <Screen withHeader>
      <Card>
        <Text variant="bodyBold">Lembretes só quando você quiser</Text>
        <Text variant="caption">
          Tudo começa desligado. Os avisos são criados no seu celular, sem enviar nada para fora, e
          nunca mostram valores nem nomes de metas, pois podem aparecer na tela bloqueada.
        </Text>
      </Card>

      {!notificationsSupported ? (
        <Card>
          <Text variant="caption">
            Os lembretes são entregues no aplicativo do celular. Aqui você já pode deixar suas
            escolhas salvas.
          </Text>
        </Card>
      ) : permission === 'denied' ? (
        <Card>
          <Text variant="caption" tone="danger">
            As notificações estão bloqueadas para o LumioUP. Ative nas configurações do celular para
            receber os lembretes.
          </Text>
        </Card>
      ) : null}

      {OPTIONS.map((option) => (
        <Card key={option.key}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 }}>
            <Switch
              accessibilityLabel={option.title}
              value={prefs[option.key]}
              disabled={save.isPending}
              onValueChange={(value) => void toggle(option.key, value)}
              trackColor={{ true: colors.primaryEdge, false: colors.border }}
              thumbColor={prefs[option.key] ? colors.primary : colors.surface}
            />
            <Text variant="bodyBold" style={{ flex: 1 }}>
              {option.title}
            </Text>
          </View>
          <Text variant="caption">{option.hint}</Text>
          {option.key === 'dailyReminder' && prefs.dailyReminder ? (
            <View style={{ gap: spacing.sm }}>
              <Text variant="caption">Horário do lembrete</Text>
              <SegmentedControl
                label="Horário do lembrete"
                options={DAILY_TIME_OPTIONS.map((time) => ({ value: time, label: time }))}
                value={prefs.dailyTime as (typeof DAILY_TIME_OPTIONS)[number]}
                onChange={(time) => save.mutate({ dailyTime: time })}
              />
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
