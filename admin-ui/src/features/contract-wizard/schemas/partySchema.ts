import { z } from 'zod';

/**
 * اعتبارسنجی کد ملی ایران
 * الگوریتم: وزن‌دهی ارقام + بررسی رقم کنترل
 */
export function validateIranianNationalCode(code: string): boolean {
  if (!/^\d{10}$/.test(code)) return false;
  // کدهای تکراری نامعتبر هستند (مثل 1111111111)
  if (/^(\d)\1{9}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits[9];
  const sum = digits.slice(0, 9).reduce((acc, d, i) => acc + d * (10 - i), 0);
  const remainder = sum % 11;
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

function isValidJalaliDate(value: string): boolean {
  // Accepts YYYY/MM/DD with basic Jalali range checks.
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1200 || year > 1500) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Months 7..12 have max 30 days in Jalali calendar.
  if (month >= 7 && day > 30) return false;
  return true;
}

export const naturalPersonSchema = z.object({
  national_code: z
    .string()
    .length(10, 'کد ملی باید دقیقاً ۱۰ رقم باشد (بدون خط تیره).')
    .refine(validateIranianNationalCode, 'کد ملی با الگوریتم اعتبارسنجی همخوان نیست؛ رقم‌ها را دوباره بررسی کنید.'),
  mobile: z
    .string()
    .regex(/^09\d{9}$/, 'موبایل باید ۱۱ رقم با پیش‌شماره ۰۹ باشد (مثلاً 09121234567).'),
  birth_date: z
    .string()
    .trim()
    .refine(isValidJalaliDate, 'تاریخ تولد را شمسی وارد کنید؛ فرمت: ۱۳۷۰/۰۱/۰۱ (سال چهار رقم، ماه و روز دو رقم).'),
  bank_account: z
    .string()
    .regex(
      /^IR\d{24}$/,
      'شبا باید با IR شروع شود و دقیقاً ۲۴ رقم بعد از آن داشته باشد (بدون فاصله؛ مثال: IR120000000000000000000001).'
    ),
  postal_code: z.string().regex(/^\d{10}$/, 'کد پستی باید دقیقاً ۱۰ رقم عددی باشد.'),
  is_forigen_citizen: z.boolean(),
  family_members_count: z.number().min(0).nullable(),
  home_electricy_bill: z.string().optional(),
});

export const legalPersonSignerSchema = z.object({
  national_code: z
    .string()
    .length(10)
    .refine(validateIranianNationalCode, 'کد ملی امضاکننده نامعتبر است'),
  mobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است'),
  birth_date: z
    .string()
    .trim()
    .refine(isValidJalaliDate, 'تاریخ تولد باید به فرمت 1370/01/01 باشد'),
  title: z.string().min(1, 'سمت الزامی است'),
});

export const legalPersonSchema = z.object({
  national_nc: z.string().regex(/^\d{11}$/, 'شناسه ملی شرکت باید ۱۱ رقم باشد'),
  ceo_mobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل مدیرعامل نامعتبر است'),
  /** فقط UI / فیگما؛ به API ارسال نمی‌شود */
  company_type: z.string().optional(),
  ownership_type: z.enum(['PRIVATE_DEED', 'LONG_TERM_LEASE']),
  is_knowledge_based: z.boolean(),
  postal_code: z.string().regex(/^\d{10}$/, 'کد پستی باید ۱۰ رقم باشد'),
  bank_account: z
    .string()
    .regex(/^IR\d{24}$/, 'شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد'),
  signers: z
    .array(legalPersonSignerSchema)
    .min(1, 'حداقل یک امضاکننده مجاز الزامی است'),
});

export type NaturalPersonFormData = z.infer<typeof naturalPersonSchema>;
export type LegalPersonFormData = z.infer<typeof legalPersonSchema>;
