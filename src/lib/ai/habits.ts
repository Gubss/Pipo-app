import { addDays, diffDays, stripAccents } from './dates';
import type { Habit } from './types';

/** Uma tarefa ou evento que a pessoa marcou como feito. */
export type CompletedItem = { title: string; /** AAAA-MM-DD */ doneOn: string };

/** Agrupa títulos parecidos: "Cortar o cabelo", "corte de cabelo", "Cabelo - barbeiro" -> "corte de cabelo". */
const CANONICAL: [RegExp, string, string][] = [
  [/cabel|barbe|cabeleir/, 'corte de cabelo', 'Corte de cabelo'],
  [/unha|manicure/, 'unha', 'Unha'],
  [/sobrancelha/, 'sobrancelha', 'Sobrancelha'],
  [/banho e tosa|\btosa\b|banho (do|da|no) (cachorro|cachorra|gato|gata|dog|pet)/, 'banho do pet', 'Banho do pet'],
  [/vacina.*(cachorro|cachorra|gato|gata|pet|dog)|antirrabica|\bv10\b|\bv8\b/, 'vacina do pet', 'Vacina do pet'],
  [/vermifug/, 'vermifugo do pet', 'Vermífugo do pet'],
  [/dentista|limpeza nos dentes/, 'dentista', 'Dentista'],
  [/mercado|feira\b|compras do mes/, 'mercado', 'Mercado'],
  [/troca de oleo|revisao do carro/, 'revisao do carro', 'Revisão do carro'],
  [/aluguel/, 'aluguel', 'Aluguel'],
];

export function habitKey(title: string): { key: string; label: string } {
  const t = stripAccents(title.toLowerCase());
  for (const [re, key, label] of CANONICAL) if (re.test(t)) return { key, label };
  const key = t.replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  return { key, label: title.trim() };
}

/**
 * Aprende recorrências a partir do histórico do que foi feito.
 * Precisa de pelo menos 3 ocorrências (2 intervalos) e de intervalos razoavelmente regulares.
 * Roda no aparelho; o resultado vai no campo `habits` do InterpretRequest.
 */
export function learnHabits(items: CompletedItem[], opts: { minSamples?: number; minConfidence?: number } = {}): Habit[] {
  const minSamples = opts.minSamples ?? 3;
  const minConfidence = opts.minConfidence ?? 0.5;
  const groups = new Map<string, { label: string; dates: Set<string> }>();
  for (const it of items) {
    const { key, label } = habitKey(it.title);
    if (!key) continue;
    const g = groups.get(key) ?? { label, dates: new Set<string>() };
    g.dates.add(it.doneOn);
    groups.set(key, g);
  }

  const habits: Habit[] = [];
  for (const [key, g] of groups) {
    const dates = [...g.dates].sort();
    if (dates.length < minSamples) continue;
    const gaps = dates.slice(1).map((d, i) => diffDays(d, dates[i])).filter((n) => n > 0);
    if (gaps.length < minSamples - 1) continue;
    const sorted = [...gaps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median < 2) continue; // coisa diária não vira hábito aqui
    // Regularidade: desvio médio relativo à mediana. 0 = perfeito.
    const mad = gaps.reduce((s, g2) => s + Math.abs(g2 - median), 0) / gaps.length;
    const confidence = Math.max(0, Math.min(1, 1 - mad / median)) * Math.min(1, gaps.length / 4 + 0.25);
    if (confidence < minConfidence) continue;
    const lastDone = dates[dates.length - 1];
    habits.push({
      key, label: g.label, everyDays: median, lastDone, nextDue: addDays(lastDone, median),
      samples: dates.length, confidence: Math.round(confidence * 100) / 100,
    });
  }
  return habits.sort((a, b) => a.nextDue.localeCompare(b.nextDue));
}

/** Hábitos vencendo até `withinDays` dias a partir de hoje (para o "já está na hora de cortar o cabelo?"). */
export function dueHabits(habits: Habit[], today: string, withinDays = 3): Habit[] {
  return habits.filter((h) => diffDays(h.nextDue, today) <= withinDays);
}
