import { interpret } from './ai';
import type { DraftEvent, DraftTask, InterpretResponse, Turn } from './ai/types';
import { combine, toDateKey } from './dates';
import { learnedHabits } from './habits';
import type { NewEvent } from './events';
import { keys, readSecret } from './storage';
import type { AppEvent, Profile } from './types';

export type { DraftEvent, DraftTask, InterpretResponse, Turn };

/** Conversa com o Pipo: usa a chave salva no perfil, senão as regras locais. */
export async function askPipo(args: {
  text: string;
  history: Turn[];
  draft: DraftEvent | null;
  profile?: Profile;
  events: AppEvent[];
}): Promise<InterpretResponse> {
  const apiKey = (await readSecret(keys.aiKey)) ?? undefined;
  return interpret(
    {
      text: args.text,
      now: new Date().toISOString(),
      timezone: 'America/Sao_Paulo',
      userName: args.profile?.name.split(' ')[0],
      city: args.profile?.city,
      history: args.history,
      draft: args.draft,
      habits: learnedHabits(args.events),
      knownEvents: args.events.slice(-30).map((e) => ({ title: e.title, kind: e.kind, date: toDateKey(new Date(e.startsAt)) })),
    },
    { apiKey, timeoutMs: 20000 },
  );
}

function localToIso(local: string) {
  const [date, time] = local.split('T');
  return combine(date, time ?? null).toISOString();
}

/** Converte o rascunho aprovado no formato salvo pelo app. */
export function draftToNewEvent(event: DraftEvent, tasks: DraftTask[], voiceNoteUri?: string): NewEvent {
  if (!event.date) throw new Error('Evento sem data');
  const start = combine(event.date, event.allDay ? '09:00' : event.time);
  return {
    title: event.title,
    kind: event.kind,
    emoji: event.emoji,
    startsAt: start.toISOString(),
    allDay: event.allDay || !event.time,
    repeatYearly: event.repeatYearly,
    notes: event.notes ?? undefined,
    voiceNoteUri,
    tasks: tasks.map((t) => {
      let remindAt: string;
      if (t.dueAt) remindAt = localToIso(t.dueAt);
      else {
        const d = new Date(start);
        d.setDate(d.getDate() - t.offset.days);
        const [h, m] = t.offset.atTime.split(':').map(Number);
        d.setHours(h, m, 0, 0);
        remindAt = d.toISOString();
      }
      return { title: t.title, emoji: t.emoji, nudge: t.nudge, remindAt };
    }),
  };
}
