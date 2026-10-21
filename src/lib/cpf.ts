export function onlyDigits(v: string) {
  return v.replace(/\D/g, '');
}

export function formatCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** Valida os dois dígitos verificadores do CPF. */
export function isValidCpf(v: string) {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const digit = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digit(9) === Number(d[9]) && digit(10) === Number(d[10]);
}

export function maskCpf(v: string) {
  const d = onlyDigits(v);
  return d.length === 11 ? `***.${d.slice(3, 6)}.***-${d.slice(9)}` : '';
}

/** "dd/mm/aaaa" enquanto digita. */
export function formatBirth(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

/** "dd/mm/aaaa" -> "aaaa-mm-dd", ou null se inválida/no futuro. */
export function parseBirth(v: string): string | null {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (date.getDate() !== Number(dd) || date.getMonth() !== Number(mm) - 1) return null;
  const year = Number(yyyy);
  if (year < 1900 || date > new Date()) return null;
  return `${yyyy}-${mm}-${dd}`;
}
