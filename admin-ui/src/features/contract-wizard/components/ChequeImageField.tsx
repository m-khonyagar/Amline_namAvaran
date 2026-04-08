import { useState } from 'react';
import { contractApi } from '../api/contractApi';
import { ensureMappedError } from '../../../lib/errorMapper';

function fileIdToNumeric(id: string | number): number {
  if (typeof id === 'number' && !Number.isNaN(id)) return id;
  const n = Number(String(id).trim());
  if (!Number.isNaN(n) && n > 0) return n;
  const digits = String(id).replace(/\D/g, '');
  const parsed = digits ? parseInt(digits, 10) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

interface ChequeImageFieldProps {
  value: number | null | undefined;
  onChange: (fileId: number | null) => void;
  errorMessage?: string;
  disabled?: boolean;
}

const MAX_CHEQUE_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/** بارگذاری تصویر چک و نگهداری شناسه فایل برای مراحل پرداخت چکی */
export function ChequeImageField({ value, onChange, errorMessage, disabled }: ChequeImageFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setLocalError(null);
    if (!file) {
      onChange(null);
      return;
    }
    if (file.size > MAX_CHEQUE_FILE_SIZE) {
      setLocalError('حجم تصویر چک نباید بیشتر از ۱۰ مگابایت باشد');
      onChange(null);
      return;
    }
    setUploading(true);
    try {
      const res = await contractApi.uploadFile(file, 'CHEQUE_IMAGE');
      const num = fileIdToNumeric(res.data.id);
      if (num <= 0) {
        setLocalError('شناسه فایل نامعتبر است');
        onChange(null);
        return;
      }
      onChange(num);
    } catch (err: unknown) {
      const m = ensureMappedError(err);
      setLocalError(m.message);
      onChange(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1">
      <label htmlFor="cheque-image-upload" className="block text-xs text-gray-600 mb-1">تصویر چک *</label>
      <input
        id="cheque-image-upload"
        type="file"
        accept="image/*"
        disabled={disabled || uploading}
        onChange={onFileChange}
        className="block w-full text-sm text-gray-700 file:mr-2 file:rounded file:border file:border-gray-300 file:bg-white file:px-2 file:py-1"
      />
      {uploading && <p className="text-xs text-gray-500">در حال بارگذاری…</p>}
      {value != null && value > 0 && !uploading && (
        <p className="text-xs text-green-600">تصویر ثبت شد (شناسه: {value})</p>
      )}
      {(errorMessage || localError) && (
        <p className="text-xs text-red-600" role="alert">
          {errorMessage || localError}
        </p>
      )}
    </div>
  );
}
