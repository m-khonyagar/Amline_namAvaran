import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

interface ApplicationRow {
  id: string;
  status: string;
  full_name: string;
  mobile: string;
  city: string;
  license_no: string;
  reviewer_note?: string;
  submitted_at: string;
  updated_at: string;
}

const ST: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'ارسال به کارشناس',
  UNDER_REVIEW: 'در حال بررسی',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  NEEDS_INFO: 'نیاز به مدارک بیشتر',
};

export default function DossierPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['consultant-application'],
    queryFn: async () => {
      const res = await apiClient.get<ApplicationRow | null>('/consultant/application');
      return res.data;
    },
  });

  if (isLoading) return <div className="py-12 text-center">…</div>;
  if (!data) {
    return (
      <div className="rounded-xl border border-[var(--amline-border)] p-6 text-center text-[var(--amline-fg-muted)]">
        پرونده‌ای ثبت نشده. از ثبت‌نام شروع کنید.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">پروندهٔ حرفه‌ای</h1>
      <p className="text-sm text-[var(--amline-fg-muted)]">
        وضعیت بررسی توسط کارشناسان املاین در پنل پشتیبانی به‌روز می‌شود.
      </p>
      <div className="rounded-xl border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-[var(--amline-fg-muted)]">وضعیت</dt>
            <dd className="font-semibold">{ST[data.status] ?? data.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--amline-fg-muted)]">شهر</dt>
            <dd>{data.city}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--amline-fg-muted)]">پروانه</dt>
            <dd className="font-mono text-sm">{data.license_no}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--amline-fg-muted)]">آخرین به‌روزرسانی</dt>
            <dd className="text-sm">{new Date(data.updated_at).toLocaleString('fa-IR')}</dd>
          </div>
        </dl>
        {data.reviewer_note ? (
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800">
            <strong>یادداشت کارشناس:</strong> {data.reviewer_note}
          </div>
        ) : null}
      </div>
    </div>
  );
}
