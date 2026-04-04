import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { datingSchema, type DatingFormData } from '../../schemas/contractSchemas';
import { contractApi } from '../../api/contractApi';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { useMappedStepError } from '../../hooks/useMappedStepError';
import { JalaliDateInput } from '../JalaliDateInput';
import { todayJalaliString } from '../../../../lib/jalaliDate';

export function DatingStep({ contractId, onComplete }: StepProps) {
  const { error: serverError, details, hint, setFromError, clear } = useMappedStepError();

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatingFormData>({
    resolver: zodResolver(datingSchema),
    defaultValues: {
      start_date: todayJalaliString(),
      end_date: todayJalaliString(),
      delivery_date: todayJalaliString(),
    },
  });

  async function onSubmit(data: DatingFormData) {
    clear();
    try {
      const res = await contractApi.addDating(contractId, {
        start_date: data.start_date,
        end_date: data.end_date,
        delivery_date: data.delivery_date,
        next_step: 'MORTGAGE',
      });
      const nextStep = (res.data as { next_step?: string })?.next_step ?? 'MORTGAGE';
      onComplete(nextStep as import('../../types/wizard').PRContractStep);
    } catch (err: unknown) {
      setFromError(err);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <h2 className="text-lg font-bold text-[var(--amline-fg)]">تاریخ‌های قرارداد (شمسی)</h2>
      <p className="text-sm text-[var(--amline-fg-muted)]">
        سال و ماه و روز را از لیست انتخاب کنید یا در کادر متنی به‌صورت دستی وارد کنید. ارقام فارسی هم پذیرفته
        می‌شود.
      </p>
      <StepErrorBanner message={serverError} details={details} hint={hint} onDismiss={() => clear()} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Controller
          name="start_date"
          control={control}
          render={({ field }) => (
            <JalaliDateInput
              label="تاریخ شروع"
              value={field.value}
              onChange={field.onChange}
              error={errors.start_date?.message}
              hint="اول قرارداد یا تحویل اولیه را در نظر بگیرید."
            />
          )}
        />
        <Controller
          name="end_date"
          control={control}
          render={({ field }) => (
            <JalaliDateInput
              label="تاریخ پایان"
              value={field.value}
              onChange={field.onChange}
              error={errors.end_date?.message}
            />
          )}
        />
        <Controller
          name="delivery_date"
          control={control}
          render={({ field }) => (
            <JalaliDateInput
              label="تاریخ تحویل ملک"
              value={field.value}
              onChange={field.onChange}
              error={errors.delivery_date?.message}
            />
          )}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-[var(--amline-radius-lg)] bg-[var(--amline-accent)] py-3 font-semibold text-white shadow-md transition hover:opacity-95 disabled:opacity-50 dark:shadow-black/30"
        >
          {isSubmitting ? 'در حال ثبت...' : 'ثبت تاریخ‌ها و ادامه'}
        </button>
      </form>
    </div>
  );
}
