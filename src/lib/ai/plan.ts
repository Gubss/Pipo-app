import { habitKey } from './habits';
import { localNow, scheduleTask, diffDays, weekdayOf, WEEKDAY_LONG, stripAccents, type LocalNow } from './dates';
import type {
  DraftEvent, DraftTask, FollowUpQuestion, Habit, InterpretRequest, InterpretResponse, TaskCategory,
} from './types';

/** Tarefa como o planejador (IA ou regras) devolve, antes de calcular o horário do lembrete. */
export type RawTask = {
  title: string;
  emoji: string;
  category: TaskCategory;
  daysBefore: number;
  atTime: string;
  notify: boolean;
  nudge: string;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Tira campos inválidos que um modelo pode inventar. */
export function sanitizeEvent(e: DraftEvent): DraftEvent {
  return {
    ...e,
    title: e.title.trim().slice(0, 60) || 'Compromisso',
    date: e.date && DATE_RE.test(e.date) ? e.date : null,
    time: e.time && TIME_RE.test(e.time) ? e.time : null,
  };
}

function habitCovers(habits: Habit[] | undefined, task: RawTask, eventDate: string) {
  if (!habits?.length) return null;
  const { key } = habitKey(task.title);
  return habits.find((h) => {
    if (h.key !== key) return false;
    // Fez há pouco tempo antes do evento: não precisa repetir.
    const gap = diffDays(eventDate, h.lastDone);
    return gap >= 0 && gap <= Math.min(7, Math.round(h.everyDays / 3));
  }) ?? null;
}

/**
 * Passo final comum ao Claude e às regras locais:
 * valida o rascunho, decide o status, calcula dueAt de cada tarefa e monta as perguntas.
 */
export function finalize(
  req: InterpretRequest,
  event: DraftEvent | null,
  rawTasks: RawTask[],
  mascotReply: string,
  questions: FollowUpQuestion[],
  source: InterpretResponse['source'],
): InterpretResponse {
  if (!event) {
    return { status: 'not_an_event', mascotReply, followUpQuestions: [], event: null, tasks: [], source };
  }
  const now = localNow(req.now, req.timezone);
  const ev = sanitizeEvent(event);
  if (ev.allDay) ev.time = null;

  const missing: FollowUpQuestion[] = [];
  if (!ev.date) missing.push(questions.find((q) => q.field === 'date') ?? { field: 'date', question: `Que dia vai ser ${articleFor(ev.title)}?` });
  if (!ev.allDay && !ev.time) missing.push(questions.find((q) => q.field === 'time') ?? { field: 'time', question: `Que horas vai ser ${articleFor(ev.title)}${req.userName ? `, ${req.userName}` : ''}?` });
  const followUpQuestions = [...missing, ...questions.filter((q) => q.field !== 'date' && q.field !== 'time')].slice(0, 2);

  const tasks: DraftTask[] = [];
  for (const t of rawTasks) {
    const atTime = TIME_RE.test(t.atTime) ? t.atTime : '09:00';
    const days = Math.max(0, Math.min(365, Math.round(t.daysBefore)));
    const base = { title: t.title, emoji: t.emoji, category: t.category, offset: { days, atTime }, nudge: t.nudge };
    if (!ev.date) {
      tasks.push({ ...base, dueAt: null, notify: t.notify });
      continue;
    }
    if (habitCovers(req.habits, t, ev.date)) continue;
    const dueAt = scheduleTask(ev.date, ev.time, days, atTime, now);
    // Sem tempo antes do evento: some do checklist (a não ser que a pessoa ainda possa fazer no dia).
    if (!dueAt) continue;
    tasks.push({ ...base, dueAt, notify: t.notify });
  }
  tasks.sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));
  spreadCollisions(tasks);

  if (ev.date && ev.date < now.date && !ev.repeatYearly) {
    followUpQuestions.unshift({ field: 'date', question: `Essa data (${formatDate(ev.date)}) já passou. Foi isso mesmo?` });
  }

  const status = missing.length ? 'needs_info' : 'ready';
  return { status, mascotReply, followUpQuestions: status === 'ready' ? followUpQuestions.filter((q) => q.field !== 'date' && q.field !== 'time') : followUpQuestions, event: ev, tasks, source };
}

/** Várias tarefas puxadas para o mesmo horário viram uma rajada de notificações: espaça de 30 em 30 min. */
function spreadCollisions(tasks: DraftTask[]) {
  for (let i = 1; i < tasks.length; i++) {
    const prev = tasks[i - 1].dueAt;
    const cur = tasks[i].dueAt;
    if (!prev || !cur || cur > prev) continue;
    const [d, t] = prev.split('T');
    const [h, m] = t.split(':').map(Number);
    const mins = h * 60 + m + 30;
    if (mins >= 23 * 60) continue; // não empurra para a madrugada
    tasks[i].dueAt = `${d}T${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
  }
}

function articleFor(title: string) {
  const t = stripAccents(title.toLowerCase());
  const fem = /^(festa|consulta|viagem|vacina|entrevista|formatura|reuniao|cerimonia|limpeza|tosa)/.test(t);
  return `${fem ? 'a' : 'o'} ${title.charAt(0).toLowerCase()}${title.slice(1)}`;
}

export function formatDate(date: string) {
  const [, m, d] = date.split('-');
  return `${WEEKDAY_LONG[weekdayOf(date)]}, ${d}/${m}`;
}

export type { LocalNow };
