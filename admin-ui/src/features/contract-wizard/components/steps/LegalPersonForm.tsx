import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { legalPersonSchema, type LegalPersonFormData } from '../../schemas/partySchema';

interface LegalPersonFormProps {
  defaultValues?: Partial<LegalPersonFormData>;
  onSubmit: (data: LegalPersonFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function LegalPersonForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'ثبت اطلاعات',
}: LegalPersonFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LegalPersonFormData>({
    resolver: zodResolver(legalPersonSchema),
    defaultValues: {
      signers: [{ national_code: '', mobile: '', birth_date: '', title: '' }],
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'signers' });

  return (
    <form dir="rtl" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* شناسه ملی شرکت */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">شناسه ملی شرکت *</label>
        <input
          {...register('national_nc')}
          type="text"
          inputMode="numeric"
          maxLength={11}
          placeholder="۱۱ رقم"
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.national_nc ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.national_nc && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.national_nc.message}</p>
        )}
      </div>

      {/* موبایل مدیرعامل */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">موبایل مدیرعامل *</label>
        <input
          {...register('ceo_mobile')}
          type="tel"
          inputMode="numeric"
          maxLength={11}
          placeholder="09xxxxxxxxx"
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.ceo_mobile ? 'border-red-500' : 'border-gray-300'}`}
        />
        {errors.ceo_mobile && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.ceo_mobile.message}</p>
        )}
      </div>

      {/* نوع مالکیت */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">نوع مالکیت *</label>
        <select
          {...register('ownership_type')}
          className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-white ${errors.ownership_type ? 'border-red-500' : 'border-gray-300'}`}
        >
          <option value="PRIVATE_DEED">سند خصوصی</option>
          <option value="LONG_TERM_LEASE">اجاره بلندمدت</option>
        </select>
        {errors.ownership_type && (
          <p className="mt-1 text-xs text-red-600" role="alert">{errors.ownership_type.message}</p>
        )}
      </div>

      {/* دانش‌بنیان */}
      <div className="flex items-center gap-2">
        <input
          {...register('is_knowledge_based')}
          id="is_knowledge_based"
          type="checkbox"
          className="w-4 h-4 rounded border-gray-300 text-primary"
        />
        <label htmlFor="is_knowledge_based" className="text-sm text-gray-700">
          شرکت دانش‌بنیان
        </label>
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

      {/* امضاکنندگان */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">امضاکنندگان مجاز *</p>
          <button
            type="button"
            onClick={() => append({ national_code: '', mobile: '', birth_date: '', title: '' })}
            className="text-sm text-primary hover:underline"
          >
            + افزودن امضاکننده
          </button>
        </div>

        {errors.signers?.root && (
          <p className="text-xs text-red-600" role="alert">{errors.signers.root.message}</p>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">امضاکننده {index + 1}</span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  حذف
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">کد ملی *</label>
              <input
                {...register(`signers.${index}.national_code`)}
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="۱۰ رقم"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.signers?.[index]?.national_code ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.signers?.[index]?.national_code && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errors.signers[index]?.national_code?.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">موبایل *</label>
              <input
                {...register(`signers.${index}.mobile`)}
                type="tel"
                inputMode="numeric"
                maxLength={11}
                placeholder="09xxxxxxxxx"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.signers?.[index]?.mobile ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.signers?.[index]?.mobile && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errors.signers[index]?.mobile?.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">تاریخ تولد *</label>
              <input
                {...register(`signers.${index}.birth_date`)}
                type="text"
                placeholder="1370/01/01"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.signers?.[index]?.birth_date ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.signers?.[index]?.birth_date && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errors.signers[index]?.birth_date?.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">سمت *</label>
              <input
                {...register(`signers.${index}.title`)}
                type="text"
                placeholder="مثال: مدیرعامل"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${errors.signers?.[index]?.title ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.signers?.[index]?.title && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errors.signers[index]?.title?.message}
                </p>
              )}
            </div>
          </div>
        ))}
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
