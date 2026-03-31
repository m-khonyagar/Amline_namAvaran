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

export const naturalPersonSchema = z.object({
  national_code: z
    .string()
    .length(10, 'کد ملی باید ۱۰ رقم باشد')
    .refine(validateIranianNationalCode, 'کد ملی نامعتبر است'),
  mobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل نامعتبر است'),
  birth_date: z.string().min(1, 'تاریخ تولد الزامی است'),
  bank_account: z
    .string()
    .regex(/^IR\d{24}$/, 'شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد'),
  postal_code: z.string().length(10, 'کد پستی باید ۱۰ رقم باشد'),
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
  birth_date: z.string().min(1, 'تاریخ تولد الزامی است'),
  title: z.string().min(1, 'سمت الزامی است'),
});

export const legalPersonSchema = z.object({
  national_nc: z.string().length(11, 'شناسه ملی شرکت باید ۱۱ رقم باشد'),
  ceo_mobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل مدیرعامل نامعتبر است'),
  ownership_type: z.enum(['PRIVATE_DEED', 'LONG_TERM_LEASE']),
  is_knowledge_based: z.boolean(),
  postal_code: z.string().length(10, 'کد پستی باید ۱۰ رقم باشد'),
  bank_account: z
    .string()
    .regex(/^IR\d{24}$/, 'شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد'),
  signers: z
    .array(legalPersonSignerSchema)
    .min(1, 'حداقل یک امضاکننده مجاز الزامی است'),
});

export type NaturalPersonFormData = z.infer<typeof naturalPersonSchema>;
export type LegalPersonFormData = z.infer<typeof legalPersonSchema>;
