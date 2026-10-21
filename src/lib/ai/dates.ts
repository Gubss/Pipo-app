/**
 * Datas em português e aritmética de calendário.
 * parseDatePt / parseTimePt seguem o lembra-app/src/lib/dates.ts, com alguns casos a mais
 * ("domingo agora", "fim de semana", "daqui a 3 dias").
 * Datas são strings "AAAA-MM-DD" e a conta é feita em UTC para não sofrer com horário de verão.
 */

const WEEKDAYS: [RegExp, number][] = [
  [/\bdomingo\b/, 0],
  [/\bsegunda(-feira)?\b/, 1],
  [/\bter[cç]a(-feira)?\b/, 2],
  [/\bquarta(-feira)?\b/, 3],
  [/\bquinta(-feira)?\b/, 4],
  [/\bsexta(-feira)?\b/, 5],
  [/\bs[aá]bado\b/, 6],
];

const MONTHS = [
  'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const WEEKDAY_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export type LocalNow = { date: string; time: string; weekday: number };

/**
 * "Agora" no fuso da pessoa. Usa Intl quando há timezone (servidor);
 * sem timezone, usa o relógio local do aparelho.
 */
export function localNow(nowIso: string, timezone?: string): LocalNow {
  const d = new Date(nowIso);
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(d);
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
      const date = `${get('year')}-${get('month')}-${get('day')}`;
      return { date, time: `${get('hour')}:${get('minute')}`, weekday: weekdayOf(date) };
    } catch {
      // Intl sem suporte a fuso: cai no relógio do aparelho.
    }
  }
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { date, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, weekday: d.getDay() };
}

function toUtc(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(dateKey: string, n: number) {
  return fromUtc(toUtc(dateKey) + n * 86400000);
}

export function diffDays(a: string, b: string) {
  return Math.round((toUtc(a) - toUtc(b)) / 86400000);
}

export function weekdayOf(dateKey: string) {
  return new Date(toUtc(dateKey)).getUTCDay();
}

function makeDate(y: number, m0: number, d: number): string | null {
  const ms = Date.UTC(y, m0, d);
  const r = new Date(ms);
  if (r.getUTCMonth() !== ((m0 % 12) + 12) % 12) return null; // 31/02 etc.
  return fromUtc(ms);
}

/** Acha uma data em português dentro da frase. Devolve "AAAA-MM-DD" ou null. */
export function parseDatePt(text: string, today: string): string | null {
  const t = stripAccents(text.toLowerCase());
  const [ty, tm] = today.split('-').map(Number);

  if (/depois de amanha/.test(t)) return addDays(today, 2);
  if (/\bamanha\b/.test(t)) return addDays(today, 1);
  if (/\bhoje\b/.test(t)) return today;

  const daqui = t.match(/\b(?:daqui a|em)\s+(\d{1,3})\s+dias?\b/);
  if (daqui) return addDays(today, Number(daqui[1]));
  const semanas = t.match(/\b(?:daqui a|em)\s+(\d{1,2})\s+semanas?\b/);
  if (semanas) return addDays(today, 7 * Number(semanas[1]));

  // 24/10 ou 24/10/2026
  const slash = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const day = Number(slash[1]);
    const m0 = Number(slash[2]) - 1;
    let year = slash[3] ? Number(slash[3]) : ty;
    if (year < 100) year += 2000;
    let d = makeDate(year, m0, day);
    if (d && !slash[3] && d < today) d = makeDate(year + 1, m0, day);
    if (d) return d;
  }

  // 24 de outubro
  for (let i = 0; i < MONTHS.length; i++) {
    const m = t.match(new RegExp(`\\b(\\d{1,2})\\s+de\\s+${MONTHS[i]}\\b`));
    if (m) {
      let d = makeDate(ty, i, Number(m[1]));
      if (d && d < today) d = makeDate(ty + 1, i, Number(m[1]));
      if (d) return d;
    }
  }

  // dia 24
  const dia = t.match(/\bdia\s+(\d{1,2})\b/);
  if (dia) {
    const day = Number(dia[1]);
    let d = makeDate(ty, tm - 1, day);
    if (!d || d < today) d = makeDate(ty, tm, day);
    if (d) return d;
  }

  const nextWeek = /(semana que vem|proxima semana)/.test(t);
  const wd = weekdayOf(today);

  // domingo, sexta-feira, próximo sábado, "domingo agora"...
  for (const [re, target] of WEEKDAYS) {
    if (re.test(t)) {
      let diff = (target - wd + 7) % 7;
      if (diff === 0) diff = 7;
      if (nextWeek && diff < 7) diff += 7;
      return addDays(today, diff);
    }
  }

  if (/fim de semana|final de semana/.test(t)) {
    let diff = (6 - wd + 7) % 7;
    if (nextWeek) diff += 7;
    return addDays(today, diff);
  }
  if (nextWeek) return addDays(today, 7);
  if (/(mes que vem|proximo mes)/.test(t)) return makeDate(ty, tm, Number(today.slice(8))) ?? addDays(today, 30);
  return null;
}

/** Acha um horário na frase. Devolve "HH:MM" ou null. */
export function parseTimePt(text: string): string | null {
  const t = stripAccents(text.toLowerCase());
  if (/meio[- ]dia/.test(t)) return '12:00';
  if (/meia[- ]noite/.test(t)) return '00:00';

  const m =
    t.match(/\b(?:as?\s+)?(\d{1,2})[:h](\d{2})\b/) ||
    t.match(/\b(?:as?\s+)?(\d{1,2})\s?(?:h|hs|horas?)\b/) ||
    t.match(/\b(\d{1,2})\s+(?=da (?:manha|tarde|noite))/) ||
    t.match(/\bas\s+(\d{1,2})\b/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (/(da tarde|da noite)/.test(t) && h < 12) h += 12;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

/** "AAAA-MM-DDTHH:MM" local a partir de data + hora. */
export function localDateTime(date: string, time: string) {
  return `${date}T${time}`;
}

/**
 * Quando o lembrete de uma tarefa deve disparar.
 * Se a data ideal já passou (ex.: "alugar terno 7 dias antes" para um casamento daqui a 5 dias),
 * puxa para o próximo horário possível sem passar do evento.
 * Devolve null se não há mais tempo útil antes do evento.
 */
export function scheduleTask(
  eventDate: string,
  eventTime: string | null,
  daysBefore: number,
  atTime: string,
  now: LocalNow,
): string | null {
  const ideal = addDays(eventDate, -daysBefore);
  const eventAt = localDateTime(eventDate, eventTime ?? '23:59');
  let due = localDateTime(ideal, atTime);
  const nowAt = localDateTime(now.date, now.time);
  if (due > nowAt) return due < eventAt || daysBefore > 0 ? due : null;

  // Atrasado: tenta hoje no mesmo horário, depois hoje daqui a 1h, depois amanhã.
  const candidates = [localDateTime(now.date, atTime)];
  const soon = nextHalfHour(now.time);
  if (soon) candidates.push(localDateTime(now.date, soon));
  candidates.push(localDateTime(addDays(now.date, 1), atTime));
  return candidates.find((c) => c > nowAt && c < eventAt) ?? null;
}

/** Daqui a ~1h, arredondado para a meia hora. null se já for tarde (depois das 21h). */
function nextHalfHour(time: string) {
  const [h, m] = time.split(':').map(Number);
  if (h >= 21) return null;
  return `${pad(h + 1)}:${m >= 30 ? '30' : '00'}`;
}
