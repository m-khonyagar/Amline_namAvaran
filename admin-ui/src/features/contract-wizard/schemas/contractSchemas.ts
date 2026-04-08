import { z } from 'zod';
import { isValidJalaliDateString } from '../../../lib/jalaliDate';

const paymentStageSchema = z
  .object({
    due_date: z.string().min(1, 'تاریخ سررسید الزامی است'),
    payment_type: z.enum(['CASH', 'CHEQUE']),
    amount: z.number().positive('مبلغ باید بزرگ‌تر از صفر باشد'),
    description: z.string().optional(),
    cheque_image_file_id: z.number().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.payment_type === 'CHEQUE') {
      if (data.cheque_image_file_id == null || data.cheque_image_file_id <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'بارگذاری تصویر چک برای پرداخت چکی الزامی است',
          path: ['cheque_image_file_id'],
        });
      }
    }
  });

const jalaliDateField = (label: string) =>
  z
    .string()
    .min(1, `${label} را وارد کنید`)
    .refine(isValidJalaliDateString, {
      message: 'تاریخ شمسی معتبر نیست — از انتخابگر یا فرمت چهاررقمی سال و دو رقم ماه/روز استفاده کنید (مثال: ۱۴۰۳/۰۶/۱۵)',
    });

/** بدون محدودیت ترتیب نسبی بین فیلدها؛ فقط اعتبار هر تاریخ شمسی */
export const datingSchema = z.object({
  start_date: jalaliDateField('تاریخ شروع'),
  end_date: jalaliDateField('تاریخ پایان'),
  delivery_date: jalaliDateField('تاریخ تحویل'),
});

export const mortgageSchema = z.object({
  total_amount: z.number().positive('مبلغ رهن باید بزرگ‌تر از صفر باشد'),
  stages: z.array(paymentStageSchema),
});

export const rentingSchema = z.object({
  monthly_rent_amount: z.number().positive('مبلغ اجاره باید بزرگ‌تر از صفر باشد'),
  rent_due_day_of_month: z.number().min(1).max(31).optional().nullable(),
  stages: z.array(paymentStageSchema),
});

export const salePriceSchema = z
  .object({
    total_price: z.number().positive('قیمت فروش باید بزرگ‌تر از صفر باشد'),
    stages: z.array(paymentStageSchema),
  })
  .refine(
    (d) =>
      d.stages.length === 0 ||
      d.stages.reduce((sum, s) => sum + (Number(s.amount) || 0), 0) === d.total_price,
    { message: 'جمع مبالغ مراحل پرداخت باید برابر قیمت کل باشد', path: ['stages'] }
  );

export type DatingFormData = z.infer<typeof datingSchema>;
export type MortgageFormData = z.infer<typeof mortgageSchema>;
export type RentingFormData = z.infer<typeof rentingSchema>;
export type SalePriceFormData = z.infer<typeof salePriceSchema>;
