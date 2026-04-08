import { useEffect, useState } from 'react';
import { apiV1 } from '../../../lib/apiPaths';
import { apiClient } from '../api/contractApi';
import { formatShamsiDate } from '../../../lib/persianDateTime';

interface Addendum {
  id: string;
  subject: string;
  created_at: string;
  sign_status: 'PENDING' | 'PARTIALLY_SIGNED' | 'FULLY_SIGNED';
}

interface AddendumListProps {
  contractId: string;
}

const signStatusLabel: Record<Addendum['sign_status'], string> = {
  PENDING: 'در انتظار امضا',
  PARTIALLY_SIGNED: 'امضای ناقص',
  FULLY_SIGNED: 'امضا شده',
};

const signStatusClass: Record<Addendum['sign_status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PARTIALLY_SIGNED: 'bg-blue-100 text-blue-700',
  FULLY_SIGNED: 'bg-green-100 text-green-700',
};

function formatDate(iso: string): string {
  try {
    return formatShamsiDate(iso);
  } catch {
    return iso;
  }
}

export function AddendumList({ contractId }: AddendumListProps) {
  const [addendums, setAddendums] = useState<Addendum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get<Addendum[]>(apiV1(`contracts/${contractId}/addendum`))
      .then((res) => setAddendums(res.data))
      .catch(() => setError('خطا در دریافت لیست متمم‌ها'))
      .finally(() => setIsLoading(false));
  }, [contractId]);

  if (isLoading) {
    return (
      <div dir="rtl" className="flex justify-center py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
        {error}
      </div>
    );
  }

  if (addendums.length === 0) {
    return (
      <div dir="rtl" className="text-sm text-gray-400 text-center py-4">
        متممی ثبت نشده است.
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-2">
      <p className="text-sm font-medium text-gray-700 mb-3">متمم‌های قرارداد</p>
      {addendums.map((addendum) => (
        <div
          key={addendum.id}
          className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-white"
        >
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-gray-800">{addendum.subject}</p>
            <p className="text-xs text-gray-400">{formatDate(addendum.created_at)}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${signStatusClass[addendum.sign_status]}`}>
            {signStatusLabel[addendum.sign_status]}
          </span>
        </div>
      ))}
    </div>
  );
}
