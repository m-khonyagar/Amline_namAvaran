import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { naturalPersonSchema, type NaturalPersonFormData } from '../../schemas/partySchema';
import { resolveService } from '../../services/resolveService';

interface NaturalPersonFormProps {
  defaultValues?: Partial<NaturalPersonFormData>;
  onSubmit: (data: NaturalPersonFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function NaturalPersonForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'ثبت اطلاعات',
}: NaturalPersonFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<NaturalPersonFormData>({
    resolver: zodResolver(naturalPersonSchema),
    defaultValues,
  });

  const nationalCode = watch('national_code');
  const bankAccount = watch('bank_account');

  // Resolve کد ملی
  useEffect(() => {
    if (!nationalCode || nationalCode.length !== 10) return;
    resolveService('ORGANIZATION_CODE', nationalCode, (res, err) => {
      if (err) {
        setError('national_code', { message: err });
      } else if (res?.result) {
        clearErrors('national_code');
      }
    });
  }, [nationalCode, setError, clearErrors]);

  // Resolve شبا
  useEffect(() => {
    if (!bankAccount || !/^IR\d{24}$/.test(bankAccount)) return;
    resolveService('BANK_IBAN', bankAccount, (res, err) => {
      if (err) {
        setError('bank_account', { message: err });
      } else if (res?.result) {
        clearErrors('bank_account');
      }
    });
  }, [bankAccount, setError, clearErrors]);

  return (
    <form dir="rtl" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* کد ملی */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">کد ملی *</label>
        <input
          {...register('national_code')}
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder="۱۰ رقم"
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.national_code ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.national_code && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.national_code.message}</p>
        )}
      </div>

      {/* شماره موبایل */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">شماره موبایل *</label>
        <input
          {...register('mobile')}
          type="tel"
          inputMode="numeric"
          maxLength={11}
          placeholder="09xxxxxxxxx"
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.mobile ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.mobile && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.mobile.message}</p>
        )}
      </div>

      {/* تاریخ تولد */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ تولد *</label>
        <input
          {...register('birth_date')}
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder="1370/01/01"
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.birth_date ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.birth_date && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.birth_date.message}</p>
        )}
      </div>

      {/* شماره شبا */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">شماره شبا *</label>
        <input
          {...register('bank_account')}
          type="text"
          maxLength={26}
          placeholder="IR + 24 رقم"
          className={`w-full border rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-primary ${errors.bank_account ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.bank_account && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.bank_account.message}</p>
        )}
      </div>

      {/* کد پستی */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">کد پستی *</label>
        <input
          {...register('postal_code')}
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder="۱۰ رقم"
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.postal_code ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.postal_code && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.postal_code.message}</p>
        )}
      </div>

      {/* تعداد اعضای خانواده */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">تعداد اعضای خانواده</label>
        <input
          {...register('family_members_count', { valueAsNumber: true })}
          type="number"
          min={0}
          placeholder="0"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* تبعه خارجی */}
      <div className="flex items-center gap-2">
        <input
          {...register('is_forigen_citizen')}
          id="is_forigen_citizen"
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-primary"
        />
        <label htmlFor="is_forigen_citizen" className="text-sm text-gray-700">
          تبعه خارجی
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-white rounded-lg py-2.5 font-medium disabled:opacity-50 mt-2"
      >
        {isLoading ? 'در حال ثبت...' : submitLabel}
      </button>
    </form>
  );
}
