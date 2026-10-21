import { startOfDay, toDateKey } from './dates';
import type { AppEvent, Task } from './types';

/** Próxima vez que o evento acontece (aniversários repetem todo ano). */
export function nextOccurrence(ev: AppEvent, now = new Date()) {
  const d = new Date(ev.startsAt);
  if (!ev.repeatYearly) return d;
  const today = startOfDay(now);
  const next = new Date(today.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return next;
}

export function upcomingEvents(events: AppEvent[], now = new Date()) {
  const today = startOfDay(now);
  return events
    .map((ev) => ({ ev, when: nextOccurrence(ev, now) }))
    .filter((x) => x.when >= today)
    .sort((a, b) => a.when.getTime() - b.when.getTime());
}

export type TaskItem = { task: Task; event: AppEvent; when: Date };

/** Tarefas não feitas até o fim de hoje (inclui atrasadas). */
export function tasksDueToday(events: AppEvent[], now = new Date()) {
  const end = new Date(startOfDay(now).getTime() + 86400000);
  const items: TaskItem[] = [];
  for (const event of events) {
    for (const task of event.tasks) {
      const when = new Date(task.remindAt);
      if (!task.done && when < end && new Date(event.startsAt) >= startOfDay(now)) items.push({ task, event, when });
    }
  }
  return items.sort((a, b) => a.when.getTime() - b.when.getTime());
}

/** Tudo que cai num dia: eventos e tarefas. */
export function itemsOnDay(events: AppEvent[], day: Date, now = new Date()) {
  const key = toDateKey(day);
  const evs = events.filter((ev) => toDateKey(nextOccurrence(ev, now)) === key);
  const tasks: TaskItem[] = [];
  for (const event of events) {
    for (const task of event.tasks) {
      const when = new Date(task.remindAt);
      if (toDateKey(when) === key) tasks.push({ task, event, when });
    }
  }
  return { events: evs, tasks: tasks.sort((a, b) => a.when.getTime() - b.when.getTime()) };
}

export function hasSomethingOn(events: AppEvent[], day: Date, now = new Date()) {
  const { events: e, tasks } = itemsOnDay(events, day, now);
  return e.length > 0 || tasks.length > 0;
}
