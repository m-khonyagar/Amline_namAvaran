import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { contractApi } from '../../api/contractApi';
import { resolveService } from '../../services/resolveService';
import type { StepProps } from '../../types/wizard';
import { StepErrorBanner } from '../StepErrorBanner';
import { ensureMappedError } from '../../../../lib/errorMapper';
import { useMappedStepError } from '../../hooks/useMappedStepError';

interface PlaceInfoFormData {
  postal_code: string;
  electricity_bill_id: string;
  area_m2: number;
  construction_date: string;
  property_use_type: 'RESIDENTIAL' | 'COMMERCIAL';
  restroom_type: 'NO_RESTROOM' | 'IRANIAN' | 'FOREIGN' | 'IRANIAN_AND_FOREIGN';
  heating_system_type: string;
  cooling_system_type: string;
  has_elevator: boolean;
  parking_number: string;
  storage_number: string;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export function PlaceInfoStep({ contractId, contractType, onComplete }: StepProps) {
  const { error: serverError, details, hint, setFromError, clear } = useMappedStepError();
  const [uploadedFileIds, setUploadedFileIds] = useState<number[]>([]);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [postalResolved, setPostalResolved] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<PlaceInfoFormData>({
    defaultValues: {
      property_use_type: 'RESIDENTIAL',
      restroom_type: 'IRANIAN',
      has_elevator: false,
    },
  });

  const postalCode = watch('postal_code');

  useEffect(() => {
    if (!postalCode || postalCode.length !== 10) {
      setPostalResolved(null);
      return;
    }
    resolveService('POSTAL_CODE', postalCode, (res, err) => {
      if (err) {
        setError('postal_code', { message: err });
        setPostalResolved(null);
      } else if (res?.result) {
        clearErrors('postal_code');
        setPostalResolved(res.result);
      }
    });
  }, [postalCode, setError, clearErrors]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (uploadedFileIds.length + files.length > MAX_FILES) {
      setFileError(`حداکثر ${MAX_FILES} فایل مجاز است`);
      return;
    }

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFileError('فقط فایل‌های JPG، PNG و PDF مجاز هستند');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError('حجم هر فایل نباید بیشتر از ۱۰ مگابایت باشد');
        return;
      }
    }

    setFileError(null);
    setIsUploading(true);
    try {
      const results = await Promise.all(
        files.map((f) => contractApi.uploadFile(f, 'DEED_IMAGE'))
      );
      const ids = results.map((r: { data: { id: string | number } }) => Number(r.data.id));
      setUploadedFileIds((prev) => [...prev, ...ids]);
      setUploadedFileNames((prev) => [...prev, ...files.map((f) => f.name)]);
    } catch (err: unknown) {
      setFileError(ensureMappedError(err).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeFile(index: number) {
    setUploadedFileIds((prev) => prev.filter((_, i) => i !== index));
    setUploadedFileNames((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(data: PlaceInfoFormData) {
    clear();
    try {
      const res = await contractApi.addHomeInfo(contractId, {
        property_use_type: data.property_use_type,
        deed_image_file_ids: uploadedFileIds,
        postal_code: Number(data.postal_code),
        electricity_bill_id: Number(data.electricity_bill_id),
        area_m2: data.area_m2,
        construction_date: data.construction_date,
        restroom_type: data.restroom_type,
        heating_system_type: data.heating_system_type,
        cooling_system_type: data.cooling_system_type,
        water_supply_type: 'PRIVATE',
        electricity_supply_type: 'PRIVATE',
        gas_supply_type: 'PRIVATE',
        wastewater_supply_type: 'PRIVATE',
        storage_area_m2: null,
        has_elevator: data.has_elevator,
        parking_number: data.parking_number || null,
        storage_number: data.storage_number || null,
        next_step: 'DATING',
      });
      const nextStep = (res.data as { next_step?: string })?.next_step ?? 'DATING';
      onComplete(nextStep as import('../../types/wizard').PRContractStep);
    } catch (err: unknown) {
      setFromError(err);
    }
  }

  return (
    <div dir="rtl" className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">
        {contractType === 'PROPERTY_RENT' ? 'اطلاعات ملک اجاره‌ای' : 'اطلاعات ملک'}
      </h2>
      <StepErrorBanner message={serverError} details={details} hint={hint} onDismiss={() => clear()} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* کد پستی */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">کد پستی *</label>
          <input
            {...register('postal_code', {
              required: 'کد پستی الزامی است',
              pattern: { value: /^\d{10}$/, message: 'کد پستی باید ۱۰ رقم باشد' },
            })}
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="۱۰ رقم"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.postal_code ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.postal_code && (
            <p className="mt-1 text-xs text-red-600" role="alert">{errors.postal_code.message}</p>
          )}
          {postalResolved && !errors.postal_code && (
            <p className="mt-1 text-xs text-green-600">📍 {postalResolved}</p>
          )}
        </div>

        {/* شناسه قبض برق */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">شناسه قبض برق *</label>
          <input
            {...register('electricity_bill_id', { required: 'شناسه قبض برق الزامی است' })}
            type="text"
            inputMode="numeric"
            placeholder="شناسه قبض"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.electricity_bill_id ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.electricity_bill_id && (
            <p className="mt-1 text-xs text-red-600" role="alert">{errors.electricity_bill_id.message}</p>
          )}
        </div>

        {/* متراژ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">متراژ (متر مربع) *</label>
          <input
            {...register('area_m2', {
              required: 'متراژ الزامی است',
              valueAsNumber: true,
              min: { value: 1, message: 'متراژ باید بزرگ‌تر از صفر باشد' },
            })}
            type="number"
            min={1}
            placeholder="مثال: 80"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.area_m2 ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.area_m2 && (
            <p className="mt-1 text-xs text-red-600" role="alert">{errors.area_m2.message}</p>
          )}
        </div>

        {/* تاریخ ساخت */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تاریخ ساخت *</label>
          <input
            {...register('construction_date', { required: 'تاریخ ساخت الزامی است' })}
            type="text"
            placeholder="1380/01/01"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.construction_date ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.construction_date && (
            <p className="mt-1 text-xs text-red-600" role="alert">{errors.construction_date.message}</p>
          )}
        </div>

        {/* نوع کاربری */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نوع کاربری *</label>
          <select
            {...register('property_use_type')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="RESIDENTIAL">مسکونی</option>
            <option value="COMMERCIAL">تجاری</option>
          </select>
        </div>

        {/* نوع سرویس بهداشتی */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نوع سرویس بهداشتی *</label>
          <select
            {...register('restroom_type')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            <option value="NO_RESTROOM">بدون سرویس</option>
            <option value="IRANIAN">ایرانی</option>
            <option value="FOREIGN">فرنگی</option>
            <option value="IRANIAN_AND_FOREIGN">ایرانی و فرنگی</option>
          </select>
        </div>

        {/* سیستم گرمایش */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">سیستم گرمایش *</label>
          <input
            {...register('heating_system_type', { required: 'سیستم گرمایش الزامی است' })}
            type="text"
            placeholder="مثال: پکیج، شوفاژ"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.heating_system_type ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.heating_system_type && (
            <p className="mt-1 text-xs text-red-600" role="alert">{errors.heating_system_type.message}</p>
          )}
        </div>

        {/* سیستم سرمایش */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">سیستم سرمایش *</label>
          <input
            {...register('cooling_system_type', { required: 'سیستم سرمایش الزامی است' })}
            type="text"
            placeholder="مثال: کولر آبی، اسپلیت"
            className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary ${errors.cooling_system_type ? 'border-red-500' : 'border-gray-300'}`}
          />
          {errors.cooling_system_type && (
            <p className="mt-1 text-xs text-red-600" role="alert">{errors.cooling_system_type.message}</p>
          )}
        </div>

        {/* آسانسور */}
        <div className="flex items-center gap-2">
          <input
            {...register('has_elevator')}
            id="has_elevator"
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-primary"
          />
          <label htmlFor="has_elevator" className="text-sm text-gray-700">دارای آسانسور</label>
        </div>

        {/* پارکینگ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تعداد پارکینگ</label>
          <input
            {...register('parking_number')}
            type="number"
            min={0}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* انباری */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">تعداد انباری</label>
          <input
            {...register('storage_number')}
            type="number"
            min={0}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* آپلود تصاویر سند */}
        <div>
          <label htmlFor="deed-image-upload" className="block text-sm font-medium text-gray-700 mb-1">
            تصاویر سند (حداکثر ۵ فایل، JPG/PNG/PDF، حداکثر ۱۰ مگابایت)
          </label>
          <input
            id="deed-image-upload"
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            multiple
            onChange={handleFileChange}
            disabled={isUploading || uploadedFileIds.length >= MAX_FILES}
            className="w-full text-sm text-gray-600 file:ml-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary/10 file:text-primary hover:file:bg-primary/20 disabled:opacity-50"
          />
          {fileError && (
            <p className="mt-1 text-xs text-red-600" role="alert">{fileError}</p>
          )}
          {isUploading && (
            <p className="mt-1 text-xs text-gray-500 animate-pulse">در حال آپلود...</p>
          )}
          {uploadedFileNames.length > 0 && (
            <ul className="mt-2 space-y-1">
              {uploadedFileNames.map((name, i) => (
                <li key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                  <span>📎 {name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-red-400 hover:text-red-600 mr-2"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="w-full bg-primary text-white rounded-lg py-2.5 font-medium disabled:opacity-50"
        >
          {isSubmitting
            ? 'در حال ثبت...'
            : contractType === 'PROPERTY_RENT'
              ? 'ثبت اطلاعات ملک اجاره‌ای و ادامه'
              : 'ثبت اطلاعات ملک و ادامه'}
        </button>
      </form>
    </div>
  );
}
