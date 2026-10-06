import type { PlannedNotification } from '@lumioup/core';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Lembretes locais só existem no celular: no navegador as funções não fazem nada. */
export const notificationsSupported = Platform.OS === 'android' || Platform.OS === 'ios';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

const CHANNEL_ID = 'lembretes';
let configured = false;
/** Evita reabrir a mesma notificação toda vez que o app é montado de novo. */
let lastHandled: number | null = null;

/** Configuração única: como mostrar com o app aberto e o canal do Android. */
async function configure(): Promise<void> {
  if (configured || !notificationsSupported) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function getPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  const result = await Notifications.getPermissionsAsync();
  if (result.granted) return 'granted';
  return result.canAskAgain ? 'undetermined' : 'denied';
}

/** Pede a permissão (só quando a pessoa liga uma opção). */
export async function requestPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  await configure();
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  if (result.granted) return 'granted';
  return result.canAskAgain ? 'undetermined' : 'denied';
}

/** Troca todos os lembretes agendados pelos do plano (lista vazia = cancela tudo). */
export async function syncSchedule(planned: readonly PlannedNotification[]): Promise<void> {
  if (!notificationsSupported) return;
  await configure();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const item of planned) {
    const [year, month, day] = item.at.date.split('-').map(Number) as [number, number, number];
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: { title: item.title, body: item.body, data: { route: item.route } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(year, month - 1, day, item.at.hour, item.at.minute, 0, 0),
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** Escuta o toque numa notificação e devolve a tela a abrir. Retorna a função de limpeza. */
export function onNotificationOpened(handler: (route: string) => void): () => void {
  if (!notificationsSupported) return () => {};
  const open = (response: Notifications.NotificationResponse | null) => {
    if (!response || response.notification.date === lastHandled) return;
    const route = response.notification.request.content.data?.route;
    if (typeof route === 'string' && route.startsWith('/')) {
      lastHandled = response.notification.date;
      handler(route);
    }
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  // App aberto a partir do toque com ele fechado.
  void Notifications.getLastNotificationResponseAsync().then(open);
  return () => subscription.remove();
}
