import { toJalaali } from 'jalaali-js';

/** منطقهٔ نمایش همهٔ زمان‌ها در پنل ادمین */
export const TEHRAN_TZ = 'Asia/Tehran';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

const JALALI_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

function toFaDigits(str: string): string {
  return str.replace(/\d/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

function parseDateInput(input: string | Date | number): Date {
  if (input instanceof Date) return input;
  const n = typeof input === 'number' ? input : Date.parse(input);
  return new Date(Number.isFinite(n) ? n : Date.now());
}

/** تاریخ میلادی محلی تهران (سال، ماه، روز) برای تبدیل به شمسی */
function gregorianPartsInTehran(d: Date): { y: number; m: number; day: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TEHRAN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  return { y, m, day };
}

function shamsiPartsFromUtcInstant(d: Date): { jy: number; jm: number; jd: number } {
  const { y, m, day } = gregorianPartsInTehran(d);
  return toJalaali(y, m, day);
}

let persianCalendarSupported: boolean | null = null;

function intlPersianCalendarWorks(): boolean {
  if (persianCalendarSupported !== null) return persianCalendarSupported;
  try {
    const ro = new Intl.DateTimeFormat('fa-IR', {
      timeZone: TEHRAN_TZ,
      calendar: 'persian',
    }).resolvedOptions();
    persianCalendarSupported = ro.calendar === 'persian';
  } catch {
    persianCalendarSupported = false;
  }
  return persianCalendarSupported;
}

function fmtPersianCalendar(
  d: Date,
  opts: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: TEHRAN_TZ,
    calendar: 'persian',
    ...opts,
  }).format(d);
}

/** فقط تاریخ شمسی (بدون ساعت)، تقویم ایران، روز بر اساس تهران */
export function formatShamsiDate(input: string | Date | number): string {
  const d = parseDateInput(input);
  if (intlPersianCalendarWorks()) {
    try {
      return fmtPersianCalendar(d, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      /* fallback */
    }
  }
  const { jy, jm, jd } = shamsiPartsFromUtcInstant(d);
  const label = `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`;
  return toFaDigits(String(label));
}

/** تاریخ کوتاه: ۱۴۰۳/۰۶/۱۵ */
export function formatShamsiDateShort(input: string | Date | number): string {
  const d = parseDateInput(input);
  const { jy, jm, jd } = shamsiPartsFromUtcInstant(d);
  const core = `${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`;
  return toFaDigits(core);
}

/** فقط ساعت در تهران (۲۴ ساعته) */
export function formatTehranTime(input: string | Date | number, withSeconds = false): string {
  const d = parseDateInput(input);
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: TEHRAN_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  }).format(d);
}

/** تاریخ شمسی + ساعت تهران */
export function formatShamsiDateTime(input: string | Date | number): string {
  const d = parseDateInput(input);
  if (intlPersianCalendarWorks()) {
    try {
      const datePart = fmtPersianCalendar(d, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timePart = formatTehranTime(d, true);
      return `${datePart}، ${timePart}`;
    } catch {
      /* fallback */
    }
  }
  return `${formatShamsiDate(d)}، ${formatTehranTime(d, true)}`;
}

/** برای داشبورد: نام روز هفته + تاریخ شمسی کامل */
export function formatShamsiWeekdayLong(input: string | Date | number): string {
  const d = parseDateInput(input);
  if (intlPersianCalendarWorks()) {
    try {
      return fmtPersianCalendar(d, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      /* fallback */
    }
  }
  const weekday = new Intl.DateTimeFormat('fa-IR', {
    timeZone: TEHRAN_TZ,
    weekday: 'long',
  }).format(d);
  return `${weekday}، ${formatShamsiDate(d)}`;
}

/** برچسب نسبی ساده (امروز / دیروز / تاریخ) */
export function formatShamsiRelativeDay(input: string | Date | number): string {
  const d = parseDateInput(input);
  const t0 = gregorianPartsInTehran(d);
  const now = gregorianPartsInTehran(new Date());
  const same =
    t0.y === now.y &&
    t0.m === now.m &&
    t0.day === now.day;
  if (same) return `امروز، ${formatTehranTime(d, false)}`;
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const ty = gregorianPartsInTehran(yest);
  if (t0.y === ty.y && t0.m === ty.m && t0.day === ty.day) return 'دیروز';
  return formatShamsiDate(d);
}
