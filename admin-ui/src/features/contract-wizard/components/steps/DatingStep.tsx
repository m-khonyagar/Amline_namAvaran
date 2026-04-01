import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { datingSchema, type DatingFormData } from '../../schemas/contractSchemas';
import { contractApi } from '../../api/contractApi';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { useMappedStepError } from '../../hooks/useMappedStepError';

export function DatingStep({ contractId, onComplete }: StepProps) {
  const { error: serverError, details, hint, setFromError, clear } = useMappedStepError();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatingFormData>({ resolver: zodResolver(datingSchema) });

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
    <div dir="rtl" className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">تاریخ‌های قرارداد</h2>
      <StepErrorBanner message={serverError} details={details} hint={hint} onDismiss={() => clear()} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ شروع *</label>
          <input
            {...register('start_date')}
            type="text"
            placeholder="1403/01/01"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.start_date ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.start_date && <p className="mt-1 text-xs text-red-600">{errors.start_date.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ پایان *</label>
          <input
            {...register('end_date')}
            type="text"
            placeholder="1404/01/01"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.end_date ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.end_date && <p className="mt-1 text-xs text-red-600">{errors.end_date.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ تحویل *</label>
          <input
            {...register('delivery_date')}
            type="text"
            placeholder="1403/01/15"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.delivery_date ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.delivery_date && <p className="mt-1 text-xs text-red-600">{errors.delivery_date.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
        >
          {isSubmitting ? 'در حال ثبت...' : 'ثبت تاریخ‌ها و ادامه'}
        </button>
      </form>
    </div>
  );
}
