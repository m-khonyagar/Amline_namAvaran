/**
 * Jalali (Shamsi / Persian) date formatting utilities.
 * Uses jalaali-js which is already in admin-ui dependencies.
 */
import jalaali from 'jalaali-js';

const WEEKDAYS_FA = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

function toJalaali(iso: string | Date): { jy: number; jm: number; jd: number; date: Date } {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const { jy, jm, jd } = jalaali.toJalaali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
  return { jy, jm, jd, date };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Returns "۱۴۰۳/۰۱/۱۵" */
export function formatShamsiDate(iso: string | Date): string {
  try {
    const { jy, jm, jd } = toJalaali(iso);
    return `${jy}/${pad(jm)}/${pad(jd)}`;
  } catch {
    return '—';
  }
}

/** Returns "۱۴۰۳/۰۱/۱۵" — short alias */
export function formatShamsiDateShort(iso: string | Date): string {
  return formatShamsiDate(iso);
}

/** Returns "۱۴۰۳/۰۱/۱۵ ۱۴:۳۰" */
export function formatShamsiDateTime(iso: string | Date): string {
  try {
    const { jy, jm, jd, date } = toJalaali(iso);
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${jy}/${pad(jm)}/${pad(jd)} ${hh}:${mm}`;
  } catch {
    return '—';
  }
}

/** Returns e.g. "دوشنبه ۱۵ فروردین ۱۴۰۳" */
export function formatShamsiWeekdayLong(iso: string | Date): string {
  try {
    const { jy, jm, jd, date } = toJalaali(iso);
    const weekday = WEEKDAYS_FA[date.getDay()] ?? '';
    return `${weekday} ${jd} ${jalaali.jalaaliMonthName(jm)} ${jy}`;
  } catch {
    return '—';
  }
}
