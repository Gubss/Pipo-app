import { stripAccents } from './dates';
import type { LocalMemory } from './memory';
import { TEMPLATES, type EventTemplate } from './templates';

/** Palavras que não ajudam a dizer que tipo de evento é. */
export const STOPWORDS = new Set((
  'a o as os um uma uns umas de da do das dos em no na nos nas pra pro pras pros para por com sem e ou que ' +
  'eu me mim meu minha meus minhas seu sua teu tua ele ela eles elas voce voces a gente nosso nossa ' +
  'tenho tem ter vou vai vamos preciso precisa lembrar lembra lembrete levar ir fazer marcar agendar ' +
  'hoje amanha depois dia dias semana mes ano agora proximo proxima que vem as hora horas h ' +
  'domingo segunda terca quarta quinta sexta sabado manha tarde noite ' +
  'janeiro fevereiro marco abril maio junho julho agosto setembro outubro novembro dezembro ' +
  'esse essa este esta isso aquele aquela la aqui ai ja nao sim muito mais bem tipo mano ne'
).split(' '));

export function normalize(text: string) {
  return stripAccents(text.toLowerCase()).replace(/[^a-z0-9:/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function contentWords(text: string): string[] {
  return normalize(text).split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d/.test(w));
}

/** Distância de edição com transposição (Damerau/OSA), parando cedo acima de 1. */
function within1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const ra = a.slice(i), rb = b.slice(i);
  if (ra.length === rb.length) {
    // troca de 1 letra ou transposição de 2 vizinhas
    return ra.slice(1) === rb.slice(1) || (ra.length >= 2 && ra[0] === rb[1] && ra[1] === rb[0] && ra.slice(2) === rb.slice(2));
  }
  return ra.length > rb.length ? ra.slice(1) === rb : rb.slice(1) === ra;
}

function hasWord(words: string[], hint: string) {
  if (hint.includes(' ')) return words.join(' ').includes(hint);
  return words.some((w) => w === hint || (hint.length >= 5 && w.length >= 5 && within1(w, hint)));
}

export type Scored = { template: EventTemplate; score: number };

/** Pontua cada modelo para a frase. Considera padrões, palavras soltas, erros de digitação e o que foi aprendido. */
export function scoreTemplates(text: string, memory?: LocalMemory): Scored[] {
  const norm = normalize(text);
  const words = norm.split(' ');
  const original = text.split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, ''));
  const pets = new Set((memory?.pets ?? []).map((p) => stripAccents(p.toLowerCase())));
  const mentionsPet = original.some((w) => w && pets.has(stripAccents(w.toLowerCase())));

  return TEMPLATES.map((template) => {
    let score = 0;
    if (template.match.test(norm)) score += 3;
    for (const h of template.hints ?? []) if (hasWord(words, h)) score += 1;
    if (mentionsPet && template.kind === 'pet') score += 2;
    if (memory) {
      for (const w of new Set(contentWords(text))) score += memory.words[w]?.[template.id] ?? 0;
    }
    return { template, score };
  }).sort((a, b) => b.score - a.score);
}

/** Melhor modelo, ou null se nada pontuou o bastante. Empate fica com a ordem da biblioteca. */
export function classify(text: string, memory?: LocalMemory): EventTemplate | null {
  const best = scoreTemplates(text, memory)[0];
  return best && best.score >= 1 ? best.template : null;
}
