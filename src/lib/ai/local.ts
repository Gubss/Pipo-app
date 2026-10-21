import { localNow, parseDatePt, parseTimePt, stripAccents } from './dates';
import { finalize, formatDate, type RawTask } from './plan';
import { scoreTemplates } from './classify';
import { REMOVE_AFTER, type LocalMemory } from './memory';
import { GENERIC_TEMPLATE, TEMPLATES, type EventTemplate } from './templates';
import type { DraftEvent, InterpretRequest, InterpretResponse } from './types';

/**
 * Planejador por regras, sem rede. Usado offline, sem chave, ou quando a chamada ao Claude falha.
 * Entende os modelos de templates.ts e completa um rascunho em várias falas ("casamento domingo" -> "às 16h").
 */
export function interpretLocal(req: InterpretRequest): InterpretResponse {
  const now = localNow(req.now, req.timezone);
  const text = req.text.trim();
  const mem = req.memory;
  const date = parseDatePt(text, now.date);
  const time = parseTimePt(text);
  const best = scoreTemplates(text, mem)[0];
  // Sinal fraco (1 palavra solta) só vale se a frase também tiver data ou hora.
  const tpl = best && (best.score >= 2 || (best.score >= 1 && (date || time))) ? best.template : null;

  // Continuação: a pessoa está respondendo a pergunta do mascote.
  const draft = req.draft;
  const isNewEvent = tpl && draft && best.score >= 3 && tpl.kind !== draft.kind;
  if (draft && !isNewEvent && (date || time || !tpl)) {
    const ev: DraftEvent = { ...draft, date: date ?? draft.date, time: time ?? draft.time };
    const t = templateForDraft(draft);
    return finalize(req, ev, rawTasks(t, `${draft.title} ${text}`, mem), replyFor(ev, t, req), [], 'local');
  }

  if (!tpl && !date && !time) {
    return finalize(req, null, [], notAnEventReply(req), [], 'local');
  }

  const t = tpl ?? GENERIC_TEMPLATE;
  const allDay = t.allDay && !time;
  const ev: DraftEvent = {
    title: titleFrom(text, t),
    templateId: t.id,
    kind: t.kind,
    emoji: t.emoji,
    date,
    time: allDay ? null : time,
    allDay,
    repeatYearly: t.repeatYearly,
    location: null,
    notes: null,
  };
  return finalize(req, ev, rawTasks(t, text, mem), replyFor(ev, t, req), [], 'local');
}

function templateForDraft(d: DraftEvent): EventTemplate {
  return TEMPLATES.find((t) => t.id === d.templateId)
    ?? scoreTemplates(d.title).find((s) => s.score >= 1 && s.template.kind === d.kind)?.template
    ?? TEMPLATES.find((t) => t.kind === d.kind)
    ?? GENERIC_TEMPLATE;
}

function rawTasks(t: EventTemplate, text: string, mem?: LocalMemory): RawTask[] {
  const norm = stripAccents(text.toLowerCase());
  const removed = mem?.removedTasks[t.id] ?? {};
  const base: RawTask[] = t.tasks
    .filter((x) => !x.onlyIf || x.onlyIf.test(norm))
    .filter((x) => (removed[x.title] ?? 0) < REMOVE_AFTER)
    .map((x) => ({
      title: x.title, emoji: x.emoji, category: x.category,
      daysBefore: x.daysBefore, atTime: mem?.taskTimes[x.title] ?? x.atTime, notify: true, nudge: x.nudge,
    }));
  for (const a of mem?.addedTasks[t.id] ?? []) {
    if ((removed[a.title] ?? 0) >= REMOVE_AFTER || base.some((b) => b.title === a.title)) continue;
    base.push({
      title: a.title, emoji: a.emoji, category: 'outro', daysBefore: a.daysBefore,
      atTime: mem?.taskTimes[a.title] ?? a.atTime, notify: true, nudge: `Lembrete: ${a.title.charAt(0).toLowerCase()}${a.title.slice(1)}!`,
    });
  }
  return base;
}

const STOP = /\b(domingo|segunda|terca|quarta|quinta|sexta|sabado|hoje|amanha|depois|dia|as|a partir|agora|que vem|proxim[oa]|semana|mes|daqui|em \d|no dia|nesse|neste|esse|este|essa|esta|vai ser|vou|tenho|preciso|sera)\b|\d/;

/** "tenho casamento do Pedro domingo" -> "Casamento do Pedro". */
export function titleFrom(text: string, t: EventTemplate): string {
  const norm = stripAccents(text.toLowerCase());
  // Sem o padrão forte (ex.: "vacina da Mel" achado pelo nome do pet), a própria frase vira o título.
  const strong = t.id === GENERIC_TEMPLATE.id ? null : norm.match(t.match);
  const m = strong ?? genericStart(norm);
  if (!m || m.index === undefined) return t.title;
  let rest = text.slice(m.index);
  const cut = stripAccents(rest.toLowerCase()).slice(m[0].length).search(STOP);
  if (cut >= 0) rest = rest.slice(0, m[0].length + cut);
  rest = rest.replace(/[\s,.;:!?-]+$/, '').replace(/\b(minha|meu)\s+/gi, '').trim();
  if (rest.length < 3 || rest.length > 50) return t.title;
  // Só a palavra-chave ("vacina", "médico") fica genérica demais: usa o título do modelo.
  if (rest.split(/\s+/).length === 1 && strong && t.id !== 'casamento' && t.id !== 'festa') return t.title;
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
