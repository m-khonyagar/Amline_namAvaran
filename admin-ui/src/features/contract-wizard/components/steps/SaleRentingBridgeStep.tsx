import { useState } from 'react';
import { contractApi } from '../../api/contractApi';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { useMappedStepError } from '../../hooks/useMappedStepError';

/**
 * قرارداد خرید و فروش: بعد از ثبت قیمت، API مستقیماً به امضا می‌رود؛
 * اگر به‌هر دلیل مرحله RENTING باز شود، با یک ثبت حداقلی API را به SIGNING می‌رسانیم.
 */
export function SaleRentingBridgeStep({ contractId, onComplete }: StepProps) {
  const { error, details, hint, setFromError, clear } = useMappedStepError();
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setLoading(true);
    clear();
    try {
      const res = await contractApi.addRenting(contractId, {
        monthly_rent_amount: 1,
        rent_due_day_of_month: null,
        stages: [],
        next_step: 'SIGNING',
      });
      const nextStep = (res.data as { next_step?: string })?.next_step ?? 'SIGNING';
      onComplete(nextStep as import('../../types/wizard').PRContractStep);
    } catch (err: unknown) {
      setFromError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-4 max-w-md">
      <h2 className="text-lg font-bold text-gray-800">شرایط پرداخت (خرید و فروش)</h2>
      <p className="text-sm leading-relaxed text-gray-600">
        در فلوی فعلی، مبلغ و اقسط اصلی در مرحلهٔ «قیمت فروش» ثبت شده است. برای ورود به مرحلهٔ امضا،
        این گام را تأیید کنید. در صورت نیاز می‌توانید بعداً متمم قرارداد اضافه کنید.
      </p>
      <StepErrorBanner message={error} details={details} hint={hint} onDismiss={() => clear()} />
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleContinue()}
        className="w-full rounded-xl bg-primary py-3 font-bold text-white disabled:opacity-50"
      >
        {loading ? 'در حال ارسال…' : 'تأیید و ادامه به امضا'}
      </button>
    </div>
  );
}
