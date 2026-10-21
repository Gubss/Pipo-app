import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { cancelEvent, cancelTask, scheduleEvent } from './notifications';
import { keys, readJson, writeJson } from './storage';
import type { AppEvent, Task } from './types';

export type NewEvent = Omit<AppEvent, 'id' | 'createdAt' | 'notificationIds' | 'tasks'> & {
  tasks: Omit<Task, 'id' | 'done' | 'notificationId'>[];
};

type EventsState = {
  events: AppEvent[];
  addEvent: (e: NewEvent) => Promise<AppEvent>;
  toggleTask: (eventId: string, taskId: string) => Promise<void>;
  removeEvent: (eventId: string) => Promise<void>;
  rescheduleAll: (extraNudges: boolean) => Promise<void>;
};

const EventsContext = createContext<EventsState | null>(null);

export function EventsProvider({ children }: { children: ReactNode }) {
  const { account } = useAuth();
  const [events, setEvents] = useState<AppEvent[]>([]);
  const userId = account?.id;
  const extraNudges = account?.profile?.extraNudges ?? true;

  useEffect(() => {
    if (!userId) {
      setEvents([]);
      return;
    }
    readJson<AppEvent[]>(keys.events(userId), []).then(setEvents);
  }, [userId]);

  const persist = useCallback(
    async (next: AppEvent[]) => {
      if (!userId) return;
      next.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      setEvents([...next]);
      await writeJson(keys.events(userId), next);
    },
    [userId],
  );

  const addEvent = useCallback(
    async (e: NewEvent) => {
      const base: AppEvent = {
        ...e,
        id: Crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        notificationIds: [],
        tasks: e.tasks
          .map((t) => ({ ...t, id: Crypto.randomUUID(), done: false }))
          .sort((a, b) => a.remindAt.localeCompare(b.remindAt)),
      };
      const scheduled = await scheduleEvent(base, { extraNudges });
      await persist([...events, scheduled]);
      return scheduled;
    },
    [events, persist, extraNudges],
  );

  const toggleTask = useCallback(
    async (eventId: string, taskId: string) => {
      const next = events.map((ev) => {
        if (ev.id !== eventId) return ev;
        return {
          ...ev,
          tasks: ev.tasks.map((t) => {
            if (t.id !== taskId) return t;
            if (!t.done) cancelTask(t.notificationId);
            return {
              ...t,
              done: !t.done,
              doneAt: t.done ? undefined : new Date().toISOString(),
              notificationId: t.done ? t.notificationId : undefined,
            };
          }),
        };
      });
      await persist(next);
    },
    [events, persist],
  );

  const removeEvent = useCallback(
    async (eventId: string) => {
      const ev = events.find((x) => x.id === eventId);
      if (ev) await cancelEvent(ev);
      await persist(events.filter((x) => x.id !== eventId));
    },
    [events, persist],
  );

  // Usado quando a pessoa liga/desliga as notificações extras no perfil.
  const rescheduleAll = useCallback(
    async (nudges: boolean) => {
      const next: AppEvent[] = [];
      for (const ev of events) next.push(await scheduleEvent(ev, { extraNudges: nudges }));
      await persist(next);
    },
    [events, persist],
  );

  const value = useMemo(
    () => ({ events, addEvent, toggleTask, removeEvent, rescheduleAll }),
    [events, addEvent, toggleTask, removeEvent, rescheduleAll],
  );
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error('useEvents fora do EventsProvider');
  return ctx;
}
