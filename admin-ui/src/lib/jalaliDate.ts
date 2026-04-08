/**
 * تاریخ شمسی: نرمال‌سازی ارقام فارسی/عربی، پارس انعطاف‌پذیر، اعتبار با jalaali-js.
 */
import * as jalaali from 'jalaali-js';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function faDigitsToEn(s: string): string {
  let out = '';
  for (const ch of s) {
    const fi = FA_DIGITS.indexOf(ch);
    if (fi >= 0) {
      out += String(fi);
      continue;
    }
    const ai = AR_DIGITS.indexOf(ch);
    if (ai >= 0) {
      out += String(ai);
      continue;
    }
    out += ch;
  }
  return out;
}

/** فرمت خروجی یکنواخت: YYYY/MM/DD (صفرپیش) */
export function formatJalaliParts(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

export type ParsedJalali = { jy: number; jm: number; jd: number };

/**
 * پارس رشته‌هایی مثل 1403/1/5 یا ۱۴۰۳/۰۱/۱۵ — جداکننده / یا -
 */
export function parseJalaliFlexible(raw: string): ParsedJalali | null {
  const s = faDigitsToEn(raw.trim()).replace(/-/g, '/');
  const parts = s.split('/').map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 3) return null;
  const jy = parseInt(parts[0], 10);
  const jm = parseInt(parts[1], 10);
  const jd = parseInt(parts[2], 10);
  if (!Number.isFinite(jy) || !Number.isFinite(jm) || !Number.isFinite(jd)) return null;
  if (!jalaali.isValidJalaaliDate(jy, jm, jd)) return null;
  return { jy, jm, jd };
}

export function isValidJalaliDateString(raw: string): boolean {
  return parseJalaliFlexible(raw) !== null;
}

/** برای مرتب‌سازی/مقایسه (فقط اگر هر دو معتبر باشند) */
export function compareValidJalaliStrings(a: string, b: string): number | null {
  const pa = parseJalaliFlexible(a);
  const pb = parseJalaliFlexible(b);
  if (!pa || !pb) return null;
  if (pa.jy !== pb.jy) return pa.jy - pb.jy;
  if (pa.jm !== pb.jm) return pa.jm - pb.jm;
  return pa.jd - pb.jd;
}

export function todayJalaliString(): string {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return formatJalaliParts(jy, jm, jd);
}

export function jalaaliDaysInMonth(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}
