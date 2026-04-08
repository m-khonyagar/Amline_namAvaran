import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Lead } from '../types'
import { fetchCities, fetchProvinces, type CityDto, type ProvinceDto } from '../geoApi'

const leadSchema = z.object({
  full_name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
  mobile: z
    .string()
    .regex(/^09[0-9]{9}$/, 'شماره موبایل ایرانی معتبر نیست (مثال: 09121234567)'),
  need_type: z.enum(['RENT', 'BUY', 'SELL']),
  notes: z.string().default(''),
  assigned_to: z
    .string()
    .optional()
    .transform((s) => (s && s.trim().length ? s.trim() : null)),
  province_id: z.string().default(''),
  city_id: z.string().default(''),
})

export type LeadFormValues = z.infer<typeof leadSchema>

interface LeadFormProps {
  initialValues?: Partial<Lead>
  onSubmit: (values: LeadFormValues) => void
  onCancel?: () => void
  isLoading?: boolean
}

const NEED_TYPE_LABELS: Record<string, string> = {
  RENT: 'اجاره',
  BUY: 'خرید',
  SELL: 'فروش',
}

export function LeadForm({ initialValues, onSubmit, onCancel, isLoading }: LeadFormProps) {
  const [provinces, setProvinces] = useState<ProvinceDto[]>([])
  const [cities, setCities] = useState<CityDto[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      full_name: initialValues?.full_name ?? '',
      mobile: initialValues?.mobile ?? '',
      need_type: initialValues?.need_type ?? 'RENT',
      notes: initialValues?.notes ?? '',
      assigned_to: initialValues?.assigned_to ?? undefined,
      province_id: initialValues?.province_id ?? '',
      city_id: initialValues?.city_id ?? '',
    },
  })

  const provinceId = watch('province_id')

  useEffect(() => {
    void fetchProvinces().then(setProvinces)
  }, [])

  useEffect(() => {
    if (!provinceId) {
      setCities([])
      setValue('city_id', '')
      return
    }
    void fetchCities(provinceId).then((list) => {
      setCities(list)
      const current = getValues('city_id')
      if (current && !list.some((c) => c.id === current)) {
        setValue('city_id', '')
      }
    })
  }, [provinceId, setValue, getValues])

  return (
    <form dir="rtl" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">نام کامل</label>
        <input
          {...register('full_name')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="علی محمدی"
        />
        {errors.full_name && (
          <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">موبایل</label>
        <input
          {...register('mobile')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="09121234567"
          dir="ltr"
        />
        {errors.mobile && (
          <p className="mt-1 text-xs text-red-600">{errors.mobile.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">استان</label>
        <select
          {...register('province_id')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— انتخاب کنید —</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name_fa}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">شهر</label>
        <select
          {...register('city_id')}
          disabled={!provinceId}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value="">— انتخاب کنید —</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_fa}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">نوع نیاز</label>
        <select
          {...register('need_type')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(NEED_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">تخصیص به</label>
        <input
          {...register('assigned_to')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="نام کارشناس (اختیاری)"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">یادداشت</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="یادداشت‌های مرتبط..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'در حال ذخیره...' : 'ذخیره'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            انصراف
          </button>
        )}
      </div>
    </form>
  )
}
