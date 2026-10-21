import type { Habit } from './ai/types';
import { addDays, toDateKey } from './dates';
import type { AppEvent } from './types';

function normalize(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(marcar|fazer|levar|comprar|agendar|o|a|de|do|da|no|na)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tarefas que se repetem (2+ vezes) viram hábito com intervalo médio. */
export function learnedHabits(events: AppEvent[]): Habit[] {
  const groups = new Map<string, { label: string; dates: Date[] }>();
  for (const ev of events) {
    for (const t of ev.tasks) {
      if (!t.done || !t.doneAt) continue;
      const key = normalize(t.title);
      const g = groups.get(key) ?? { label: t.title, dates: [] };
      g.dates.push(new Date(t.doneAt));
      groups.set(key, g);
    }
  }
  const habits: Habit[] = [];
  for (const [key, g] of groups) {
    if (g.dates.length < 2) continue;
    g.dates.sort((a, b) => a.getTime() - b.getTime());
    const gaps = g.dates.slice(1).map((d, i) => (d.getTime() - g.dates[i].getTime()) / 86400000);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    if (avg < 3) continue;
    const spread = Math.max(...gaps) - Math.min(...gaps);
    const last = g.dates[g.dates.length - 1];
    habits.push({
      key,
      label: g.label,
      everyDays: Math.round(avg),
      lastDone: toDateKey(last),
      nextDue: toDateKey(addDays(last, Math.round(avg))),
      samples: g.dates.length,
      confidence: Math.max(0, 1 - spread / avg),
    });
  }
  return habits.sort((a, b) => a.nextDue.localeCompare(b.nextDue));
}
