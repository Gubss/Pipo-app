import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatTime } from './dates';
import type { AppEvent } from './types';

const CHANNEL = 'lembretes';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Lembretes',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function scheduleAt(date: Date, title: string, body: string, eventId: string) {
  if (date.getTime() <= Date.now()) return undefined;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: { eventId }, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
  });
}

/**
 * Agenda os avisos de um evento: as tarefas (com o tom do mascote), 1 dia antes e
 * no dia. Aniversários repetem todo ano. Devolve o evento com os ids preenchidos.
 */
export async function scheduleEvent(event: AppEvent, opts: { extraNudges: boolean }): Promise<AppEvent> {
  await cancelEvent(event);
  if (Platform.OS === 'web' || !(await ensureNotificationPermission())) return event;

  const start = new Date(event.startsAt);
  const ids: string[] = [];
  const when = event.allDay ? '' : ` às ${formatTime(start)}`;

  if (event.repeatYearly) {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: `${event.emoji} Hoje: ${event.title}`, body: 'Não esquece de dar os parabéns!', data: { eventId: event.id } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: start.getMonth(),
        day: start.getDate(),
        hour: 9,
        minute: 0,
        channelId: CHANNEL,
      },
    });
    ids.push(id);
  } else {
    const dayBefore = new Date(start);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(19, 0, 0, 0);
    const a = await scheduleAt(dayBefore, `${event.emoji} Amanhã: ${event.title}`, `Tá tudo pronto? É amanhã${when}.`, event.id);
    if (a) ids.push(a);

    const sameDay = new Date(start);
    if (event.allDay) sameDay.setHours(8, 0, 0, 0);
    else sameDay.setTime(start.getTime() - 2 * 3600000);
    const b = await scheduleAt(sameDay, `${event.emoji} ${event.title}`, event.allDay ? 'É hoje!' : `Daqui a pouco${when}.`, event.id);
    if (b) ids.push(b);
  }

  const tasks = [];
  for (const task of event.tasks) {
    let notificationId: string | undefined;
    if (!task.done && opts.extraNudges) {
      notificationId = await scheduleAt(
        new Date(task.remindAt),
        `${task.emoji ?? event.emoji} ${task.title}`,
        task.nudge ?? `Pro ${event.title.toLowerCase()}. Já resolveu?`,
        event.id,
      );
    }
    tasks.push({ ...task, notificationId });
  }

  return { ...event, tasks, notificationIds: ids };
}

export async function cancelEvent(event: AppEvent) {
  if (Platform.OS === 'web') return;
  const all = [...event.notificationIds, ...event.tasks.map((t) => t.notificationId)].filter(Boolean) as string[];
  await Promise.all(all.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
}

export async function cancelTask(notificationId?: string) {
  if (Platform.OS === 'web' || !notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
}
