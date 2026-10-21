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
  'janeiro', 'fevereiro', 'mar[cç]o', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WEEKDAY_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const MONTH_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** "AAAA-MM-DD" + "HH:MM" -> Date local. */
export function combine(dateKey: string, time: string | null) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = (time ?? '09:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Acha uma data em português dentro da frase. Devolve "AAAA-MM-DD" ou null. */
export function parseDatePt(text: string, now = new Date()): string | null {
  const t = text.toLowerCase();
  const today = startOfDay(now);

  if (/depois de amanh[aã]/.test(t)) return toDateKey(addDays(today, 2));
  if (/\bamanh[aã]\b/.test(t)) return toDateKey(addDays(today, 1));
  if (/\bhoje\b/.test(t)) return toDateKey(today);

  // 24/10 ou 24/10/2026
  const slash = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    let year = slash[3] ? Number(slash[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    let d = new Date(year, month, day);
    if (!slash[3] && d < today) d = new Date(year + 1, month, day);
    return toDateKey(d);
  }

  // 24 de outubro
  const plain = stripAccents(t);
  for (let i = 0; i < MONTHS.length; i++) {
    const re = new RegExp(`\\b(\\d{1,2})\\s+de\\s+${stripAccents(MONTHS[i]).replace('[cc]', 'c')}\\b`);
    const m = plain.match(re);
    if (m) {
      let d = new Date(today.getFullYear(), i, Number(m[1]));
      if (d < today) d = new Date(today.getFullYear() + 1, i, Number(m[1]));
      return toDateKey(d);
    }
  }

  // dia 24
  const dia = t.match(/\bdia\s+(\d{1,2})\b/);
  if (dia) {
    const day = Number(dia[1]);
    let d = new Date(today.getFullYear(), today.getMonth(), day);
    if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
    return toDateKey(d);
  }

  // domingo, sexta-feira, próximo sábado...
  for (const [re, wd] of WEEKDAYS) {
    if (re.test(t)) {
      let diff = (wd - today.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      if (/(semana que vem|pr[oó]xima semana)/.test(t) && diff < 7) diff += 7;
      return toDateKey(addDays(today, diff));
    }
  }

  if (/(semana que vem|pr[oó]xima semana)/.test(t)) return toDateKey(addDays(today, 7));
  if (/(m[eê]s que vem|pr[oó]ximo m[eê]s)/.test(t)) {
    return toDateKey(new Date(today.getFullYear(), today.getMonth() + 1, today.getDate()));
  }
  return null;
}

/** Acha um horário na frase. Devolve "HH:MM" ou null. */
export function parseTimePt(text: string): string | null {
  const t = text.toLowerCase();
  if (/meio[- ]dia/.test(t)) return '12:00';
  if (/meia[- ]noite/.test(t)) return '00:00';

  const m =
    t.match(/\b(?:[aà]s?\s+)?(\d{1,2})[:h](\d{2})\b/) ||
    t.match(/\b(?:[aà]s?\s+)?(\d{1,2})\s?(?:h|hs|horas?)\b/) ||
    t.match(/\b[aà]s\s+(\d{1,2})\b/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (/(da tarde|da noite)/.test(t) && h < 12) h += 12;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

export function formatDayLabel(d: Date, now = new Date()) {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  return `${WEEKDAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function formatTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function daysUntil(d: Date, now = new Date()) {
  return Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000);
}

export function countdownLabel(d: Date, now = new Date()) {
  const n = daysUntil(d, now);
  if (n < 0) return 'já passou';
  if (n === 0) return 'é hoje!';
  if (n === 1) return 'amanhã';
  return `em ${n} dias`;
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Boa noite';
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** "Hoje", "Amanhã" ou "domingo, 25 de out". */
export function formatLongDay(d: Date, now = new Date()) {
  const n = daysUntil(d, now);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Amanhã';
  return `${WEEKDAY_LONG[d.getDay()]}, ${d.getDate()} de ${MONTH_SHORT[d.getMonth()]}`;
}
