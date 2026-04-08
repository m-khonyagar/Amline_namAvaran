import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { mortgageSchema, type MortgageFormData } from '../../schemas/contractSchemas';
import { contractApi } from '../../api/contractApi';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { useMappedStepError } from '../../hooks/useMappedStepError';
import { ChequeImageField } from '../ChequeImageField';
import type { PaymentStage } from '../../types/api';

function toToman(rial: number): string {
  if (!rial || isNaN(rial)) return '۰';
  return (rial / 10).toLocaleString('fa-IR');
}

export function MortgageStep({ contractId, onComplete }: StepProps) {
  const { error: serverError, details, hint, setFromError, clear } = useMappedStepError();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<MortgageFormData>({
    resolver: zodResolver(mortgageSchema),
    defaultValues: { stages: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'stages' });
  const totalAmount = watch('total_amount');

  async function onSubmit(data: MortgageFormData) {
    clear();
    try {
      const stages: PaymentStage[] = data.stages.map((s) => {
        const base: PaymentStage = {
          due_date: s.due_date,
          payment_type: s.payment_type,
          amount: s.amount,
        };
        if (s.payment_type === 'CHEQUE' && s.cheque_image_file_id != null) {
          base.cheque_image_file_id = s.cheque_image_file_id;
        }
        return base;
      });
      const res = await contractApi.addMortgage(contractId, {
        total_amount: data.total_amount,
        stages,
        next_step: 'RENTING',
      });
      const nextStep = (res.data as { next_step?: string })?.next_step ?? 'RENTING';
      onComplete(nextStep as import('../../types/wizard').PRContractStep);
    } catch (err: unknown) {
      setFromError(err);
    }
  }

  return (
    <div dir="rtl" className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">رهن</h2>
      <StepErrorBanner message={serverError} details={details} hint={hint} onDismiss={() => clear()} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* مبلغ کل رهن */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ رهن (ریال) *</label>
          <input
            {...register('total_amount', { valueAsNumber: true })}
            type="number"
            min={1}
            placeholder="مثال: 500000000"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.total_amount ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.total_amount && (
            <p className="mt-1 text-xs text-red-600" role="alert">{errors.total_amount.message}</p>
          )}
          {totalAmount > 0 && !isNaN(totalAmount) && (
            <p className="mt-1 text-xs text-gray-500">معادل: {toToman(totalAmount)} تومان</p>
          )}
        </div>

        {/* مراحل پرداخت */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">مراحل پرداخت</p>
            <button
              type="button"
              onClick={() => append({ due_date: '', payment_type: 'CASH', amount: 0 })}
              className="text-sm text-primary hover:underline"
            >
              + افزودن مرحله
            </button>
          </div>

          {fields.map((field, index) => {
            const payType = watch(`stages.${index}.payment_type`);
            return (
            <div key={field.id} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">مرحله {index + 1}</span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  حذف
                </button>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">تاریخ سررسید *</label>
                <input
                  {...register(`stages.${index}.due_date`)}
                  type="text"
                  placeholder="1403/01/01"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.stages?.[index]?.due_date ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.stages?.[index]?.due_date && (
                  <p className="mt-1 text-xs text-red-600">{errors.stages[index]?.due_date?.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">نوع پرداخت *</label>
                <select
                  {...register(`stages.${index}.payment_type`, {
                    onChange: () => {
                      setValue(`stages.${index}.cheque_image_file_id`, null);
                    },
                  })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="CASH">نقدی</option>
                  <option value="CHEQUE">چک</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">مبلغ (ریال) *</label>
                <input
                  {...register(`stages.${index}.amount`, { valueAsNumber: true })}
                  type="number"
                  min={1}
                  placeholder="مبلغ"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.stages?.[index]?.amount ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.stages?.[index]?.amount && (
                  <p className="mt-1 text-xs text-red-600">{errors.stages[index]?.amount?.message}</p>
                )}
              </div>

              {payType === 'CHEQUE' && (
                <ChequeImageField
                  value={watch(`stages.${index}.cheque_image_file_id`)}
                  onChange={(id) =>
                    setValue(`stages.${index}.cheque_image_file_id`, id, { shouldValidate: true })
                  }
                  errorMessage={errors.stages?.[index]?.cheque_image_file_id?.message as string | undefined}
                  disabled={isSubmitting}
                />
              )}
            </div>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
        >
          {isSubmitting ? 'در حال ثبت...' : 'ثبت رهن و ادامه'}
        </button>
      </form>
    </div>
  );
}
