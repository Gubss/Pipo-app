import { learnHabits, type Habit } from './ai';
import { toDateKey } from './dates';
import type { AppEvent } from './types';

/** Tarefas feitas que se repetem viram hábito (ex.: corte de cabelo a cada ~30 dias). */
export function learnedHabits(events: AppEvent[]): Habit[] {
  const items = events.flatMap((ev) =>
    ev.tasks.filter((t) => t.done && t.doneAt).map((t) => ({ title: t.title, doneOn: toDateKey(new Date(t.doneAt!)) })),
  );
  return learnHabits(items);
}
