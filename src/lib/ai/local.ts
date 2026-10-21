import { localNow, parseDatePt, parseTimePt, stripAccents } from './dates';
import { finalize, formatDate, type RawTask } from './plan';
import { findTemplate, GENERIC_TEMPLATE, type EventTemplate } from './templates';
import type { DraftEvent, InterpretRequest, InterpretResponse } from './types';

/**
 * Planejador por regras, sem rede. Usado offline, sem chave, ou quando a chamada ao Claude falha.
 * Entende os modelos de templates.ts e completa um rascunho em várias falas ("casamento domingo" -> "às 16h").
 */
export function interpretLocal(req: InterpretRequest): InterpretResponse {
  const now = localNow(req.now, req.timezone);
  const text = req.text.trim();
  const tpl = findTemplate(text);
  const date = parseDatePt(text, now.date);
  const time = parseTimePt(text);

  // Continuação: a pessoa está respondendo a pergunta do mascote.
  const draft = req.draft;
  const isNewEvent = tpl && draft && tpl.kind !== draft.kind;
  if (draft && !isNewEvent && (date || time || !tpl)) {
    const ev: DraftEvent = { ...draft, date: date ?? draft.date, time: time ?? draft.time };
    const t = findTemplateForDraft(draft);
    return finalize(req, ev, rawTasks(t, `${draft.title} ${text}`), replyFor(ev, t, req), [], 'local');
  }

  if (!tpl && !date && !time) {
    return finalize(req, null, [], notAnEventReply(req), [], 'local');
  }

  const t = tpl ?? GENERIC_TEMPLATE;
  const ev: DraftEvent = {
    title: titleFrom(text, t),
    kind: t.kind,
    emoji: t.emoji,
    date,
    time: t.allDay ? null : time,
    allDay: t.allDay && !time,
    repeatYearly: t.repeatYearly,
    location: null,
    notes: null,
  };
  return finalize(req, ev, rawTasks(t, text), replyFor(ev, t, req), [], 'local');
}

function findTemplateForDraft(d: DraftEvent): EventTemplate {
  return findTemplate(d.title) ?? GENERIC_TEMPLATE;
}

function rawTasks(t: EventTemplate, text: string): RawTask[] {
  const norm = stripAccents(text.toLowerCase());
  return t.tasks
    .filter((x) => !x.onlyIf || x.onlyIf.test(norm))
    .map((x) => ({
      title: x.title, emoji: x.emoji, category: x.category,
      daysBefore: x.daysBefore, atTime: x.atTime, notify: true, nudge: x.nudge,
    }));
}

const STOP = /\b(domingo|segunda|terca|quarta|quinta|sexta|sabado|hoje|amanha|depois|dia|as|a partir|agora|que vem|proxim[oa]|semana|mes|daqui|em \d|no dia|nesse|neste|esse|este|essa|esta|vai ser|vou|tenho|preciso|sera)\b|\d/;

/** "tenho casamento do Pedro domingo" -> "Casamento do Pedro". */
export function titleFrom(text: string, t: EventTemplate): string {
  const norm = stripAccents(text.toLowerCase());
  const m = t.id === GENERIC_TEMPLATE.id ? genericStart(norm) : norm.match(t.match);
  if (!m || m.index === undefined) return t.title;
  let rest = text.slice(m.index);
  const cut = stripAccents(rest.toLowerCase()).slice(m[0].length).search(STOP);
  if (cut >= 0) rest = rest.slice(0, m[0].length + cut);
  rest = rest.replace(/[\s,.;:!?-]+$/, '').replace(/\b(minha|meu)\s+/gi, '').trim();
  if (rest.length < 3 || rest.length > 50) return t.title;
  // Só a palavra-chave ("vacina", "médico") fica genérica demais: usa o título do modelo.
  if (rest.split(/\s+/).length === 1 && t.id !== 'casamento' && t.id !== 'festa' && t.id !== GENERIC_TEMPLATE.id) return t.title;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/** No genérico, o título é a própria frase sem "tenho que", "preciso" etc. */
function genericStart(norm: string): RegExpMatchArray | null {
  const lead = norm.match(/^\s*(?:(?:eu\s+)?(?:tenho\s+(?:que\s+|um\s+|uma\s+)?|preciso\s+(?:de\s+)?|vou\s+(?:ter\s+(?:um\s+|uma\s+)?)?|lembrar\s+de\s+|me\s+lembra\s+de\s+))?/);
  const start = lead ? lead[0].length : 0;
  const word = norm.slice(start).match(/^\S+/);
  if (!word) return null;
  const m = word as RegExpMatchArray;
  m.index = start;
  return m;
}

function replyFor(ev: DraftEvent, t: EventTemplate, req: InterpretRequest) {
  if (!ev.date) return `${t.comment} Só me fala o dia.`;
  if (!ev.allDay && !ev.time) return `${t.comment} Anotei ${formatDate(ev.date)}, só falta o horário.`;
  const when = ev.time ? `${formatDate(ev.date)} às ${ev.time}` : formatDate(ev.date);
  const name = req.userName ? `, ${req.userName}` : '';
  return `Fechado${name}! ${ev.title} ${when}. ${t.comment}`;
}

function notAnEventReply(req: InterpretRequest) {
  const me = req.mascotName ?? 'eu';
  return `Hmm, não achei um compromisso aí. Me conta algo como "casamento domingo às 16h" que ${me === 'eu' ? 'eu' : me} anoto tudo!`;
}
