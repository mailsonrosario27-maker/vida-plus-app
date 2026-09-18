import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const MOTIVATIONAL_WATER_MESSAGES = [
  'Hora de beber água 💧',
  'Seu corpo agradece um copo d’água agora 💧',
  'Pausa rápida para se hidratar 💧',
];

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

function parseTime(hhmm: string): { hour: number; minute: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { hour: h, minute: m || 0 };
}

interface NotificationPrefs {
  waterReminders: boolean;
  waterStartTime: string;
  waterEndTime: string;
  waterFrequencyMin: number;
  mealReminders: boolean;
  exerciseReminders: boolean;
  fastingReminders: boolean;
  windDownReminders: boolean;
}

// Reagenda os lembretes locais diários a partir das preferências do usuário.
// Em produção, isto pode ser complementado por push notifications via Expo
// Push / FCM / APNs disparadas pelo backend (ex: campanhas do admin).
export async function syncLocalReminders(prefs: NotificationPrefs, wakeTime = '07:00', sleepTime = '22:30') {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  if (prefs.waterReminders) {
    const start = parseTime(prefs.waterStartTime);
    const end = parseTime(prefs.waterEndTime);
    const startMin = start.hour * 60 + start.minute;
    const endMin = end.hour * 60 + end.minute;
    const step = Math.max(30, prefs.waterFrequencyMin);
    let msgIndex = 0;
    for (let t = startMin; t <= endMin; t += step) {
      const hour = Math.floor(t / 60);
      const minute = t % 60;
      await Notifications.scheduleNotificationAsync({
        content: { title: 'VIDA+', body: MOTIVATIONAL_WATER_MESSAGES[msgIndex % MOTIVATIONAL_WATER_MESSAGES.length] },
        trigger: { hour, minute, repeats: true } as Notifications.CalendarTriggerInput,
      });
      msgIndex += 1;
    }
  }

  if (prefs.mealReminders) {
    const wake = parseTime(wakeTime);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'VIDA+', body: '🍽️ Que tal planejar sua próxima refeição?' },
      trigger: { hour: (wake.hour + 5) % 24, minute: wake.minute, repeats: true } as Notifications.CalendarTriggerInput,
    });
  }

  if (prefs.exerciseReminders) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'VIDA+', body: '🏃 Que tal completar 10 minutos de atividade hoje?' },
      trigger: { hour: 18, minute: 0, repeats: true } as Notifications.CalendarTriggerInput,
    });
  }

  if (prefs.windDownReminders) {
    const sleep = parseTime(sleepTime);
    const preSleepMin = sleep.hour * 60 + sleep.minute - 60;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'VIDA+', body: '🌙 Hora de começar a desacelerar para uma boa noite de sono.' },
      trigger: {
        hour: Math.floor(((preSleepMin % 1440) + 1440) / 60) % 24,
        minute: ((preSleepMin % 60) + 60) % 60,
        repeats: true,
      } as Notifications.CalendarTriggerInput,
    });
  }
}
