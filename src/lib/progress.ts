import { addDays, startOfDay, toDateKey } from './dates';
import type { AppEvent } from './types';

export type Stage = 1 | 2 | 3;

/** O lado Tamagotchi: o broto do Pipo cresce com os dias em que a pessoa cumpre algo. */
export function progressFrom(events: AppEvent[], now = new Date()) {
  const doneDays = new Set<string>();
  let doneCount = 0;
  for (const ev of events) {
    for (const t of ev.tasks) {
      if (t.done) {
        doneCount++;
        if (t.doneAt) doneDays.add(toDateKey(new Date(t.doneAt)));
      }
    }
  }

  // Sequência: dias seguidos até hoje (ou ontem) com algo feito.
  let streak = 0;
  let day = startOfDay(now);
  if (!doneDays.has(toDateKey(day))) day = addDays(day, -1);
  while (doneDays.has(toDateKey(day))) {
    streak++;
    day = addDays(day, -1);
  }

  const activeDays = doneDays.size;
  const stage: Stage = activeDays >= 30 ? 3 : activeDays >= 7 ? 2 : 1;
  const nextAt = stage === 1 ? 7 : stage === 2 ? 30 : null;
  return { doneCount, activeDays, streak, stage, nextAt };
}
