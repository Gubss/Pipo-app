import { contentWords } from './classify';
import { diffDays, stripAccents } from './dates';
import { TEMPLATES } from './templates';
import type { DraftEvent, DraftTask, InterpretResponse } from './types';

/**
 * O que o modo offline aprende com a pessoa. O app guarda isso (AsyncStorage/SecureStore)
 * e manda de volta em InterpretRequest.memory. É JSON puro e pequeno (com limites).
 */
export type LocalMemory = {
  version: 1;
  /** palavra -> { idDoModelo: peso }. Ex.: "mel" -> { "pet-vacina": 1.5 }. */
  words: Record<string, Record<string, number>>;
  /** Nomes de pets que a pessoa já citou ("Mel", "Thor"). */
  pets: string[];
  /** Nomes de pessoas que a pessoa já citou ("Pedro", "Ana"). */
  people: string[];
  /** idDoModelo -> título da tarefa -> quantas vezes a pessoa apagou. */
  removedTasks: Record<string, Record<string, number>>;
  /** idDoModelo -> tarefas que a pessoa costuma adicionar. */
  addedTasks: Record<string, LearnedTask[]>;
  /** título da tarefa -> horário que a pessoa prefere ("Cortar o cabelo" -> "18:00"). */
  taskTimes: Record<string, string>;
};

export type LearnedTask = { title: string; emoji: string; daysBefore: number; atTime: string; count: number };

/** Depois de quantas remoções uma tarefa sugerida deixa de aparecer. */
export const REMOVE_AFTER = 2;
const MAX_WORDS = 400;

export function emptyMemory(): LocalMemory {
  return { version: 1, words: {}, pets: [], people: [], removedTasks: {}, addedTasks: {}, taskTimes: {} };
}

/** O que a pessoa salvou de fato, depois de mexer na sugestão. */
export type SavedEvent = {
  event: DraftEvent;
  tasks: Pick<DraftTask, 'title' | 'emoji' | 'dueAt' | 'offset'>[];
};

const NOT_NAMES = new Set(
  ('Eu Meu Minha Tenho Preciso Vou Levar Casamento Aniversario Aniversário Festa Consulta Exame Vacina Dia Hoje Amanhã Amanha ' +
   'Domingo Segunda Terça Terca Quarta Quinta Sexta Sábado Sabado Natal Pascoa Páscoa Dr Dra Doutor Doutora Show Jogo Prova Reunião Reuniao ' +
   'Janeiro Fevereiro Março Marco Abril Maio Junho Julho Agosto Setembro Outubro Novembro Dezembro Mãe Mae Pai Vó Vo Avó Avo').split(' '),
);

/** Palavras com inicial maiúscula que não estão no começo da frase: "levar a Mel", "casamento do Pedro". */
export function properNames(text: string): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  words.forEach((raw, i) => {
    const w = raw.replace(/[^\p{L}]/gu, '');
    if (i === 0 || w.length < 2 || !/^\p{Lu}\p{Ll}+$/u.test(w) || NOT_NAMES.has(w)) return;
    out.push(w);
  });
  return out;
}

function addUnique(list: string[], items: string[], max = 50) {
  for (const it of items) {
    if (!list.some((x) => x.toLowerCase() === it.toLowerCase())) list.push(it);
  }
  return list.slice(-max);
}

function sameTitle(a: string, b: string) {
  const n = (s: string) => stripAccents(s.toLowerCase()).replace(/[^a-z0-9]/g, '');
  return n(a) === n(b);
}

/** Qual modelo representa o evento salvo: o que o rascunho usou, senão o primeiro do mesmo tipo. */
function templateIdFor(ev: DraftEvent): string | null {
  if (ev.templateId && TEMPLATES.some((t) => t.id === ev.templateId)) return ev.templateId;
  return TEMPLATES.find((t) => t.kind === ev.kind)?.id ?? null;
}

/**
 * Aprende com o que a pessoa fez com a sugestão. Chame quando ela salvar o evento.
 * - Mudou o tipo do evento: as palavras da frase passam a puxar para o tipo certo.
 * - Apagou uma tarefa sugerida 2 vezes: ela some nas próximas.
 * - Adicionou uma tarefa: ela passa a ser sugerida nesse tipo de evento.
 * - Mudou o horário de uma tarefa: o horário novo vira o padrão dela.
 * - Guarda nomes de pets e pessoas citados.
 * Devolve uma memória nova (não altera a recebida).
 */
export function learnFromCorrection(
  memory: LocalMemory | undefined,
  input: { text: string; suggested: InterpretResponse; saved: SavedEvent },
): LocalMemory {
  const mem: LocalMemory = JSON.parse(JSON.stringify(memory ?? emptyMemory()));
  const { text, suggested, saved } = input;
  const ev = saved.event;
  const tplId = templateIdFor(ev);
  const suggestedTplId = suggested.event?.templateId ?? null;

  // 1. Palavras -> tipo de evento.
  if (tplId) {
    const corrected = !suggested.event || suggested.event.kind !== ev.kind || (suggestedTplId && suggestedTplId !== tplId);
    const weight = corrected ? 1.5 : 0.25;
    for (const w of new Set(contentWords(text))) {
      const entry = (mem.words[w] ??= {});
      entry[tplId] = Math.min(4, (entry[tplId] ?? 0) + weight);
      if (corrected && suggestedTplId && entry[suggestedTplId]) entry[suggestedTplId] = Math.max(0, entry[suggestedTplId] - 0.5);
    }
    const keys = Object.keys(mem.words);
    if (keys.length > MAX_WORDS) for (const k of keys.slice(0, keys.length - MAX_WORDS)) delete mem.words[k];
  }

  // 2. Nomes.
  const names = properNames(text);
  if (ev.kind === 'pet') mem.pets = addUnique(mem.pets, names);
  else mem.people = addUnique(mem.people, names.filter((n) => !mem.pets.includes(n)));

  // 3. Tarefas removidas, adicionadas e horários.
  if (tplId && suggested.event) {
    for (const s of suggested.tasks) {
      const kept = saved.tasks.find((t) => sameTitle(t.title, s.title));
      if (!kept) {
        const r = (mem.removedTasks[tplId] ??= {});
        r[s.title] = (r[s.title] ?? 0) + 1;
      } else if (kept.offset?.atTime && kept.offset.atTime !== s.offset.atTime) {
        mem.taskTimes[s.title] = kept.offset.atTime;
      }
    }
    const added = (mem.addedTasks[tplId] ??= []);
    for (const t of saved.tasks) {
      if (suggested.tasks.some((s) => sameTitle(s.title, t.title))) continue;
      const daysBefore = t.offset?.days ?? (t.dueAt && ev.date ? Math.max(0, diffDays(ev.date, t.dueAt.slice(0, 10))) : 1);
      const atTime = t.offset?.atTime ?? t.dueAt?.slice(11, 16) ?? '19:00';
      const prev = added.find((a) => sameTitle(a.title, t.title));
      if (prev) Object.assign(prev, { daysBefore, atTime, count: prev.count + 1 });
      else added.push({ title: t.title, emoji: t.emoji || '📌', daysBefore, atTime, count: 1 });
    }
    mem.addedTasks[tplId] = added.slice(-10);
  }
  return mem;
}
