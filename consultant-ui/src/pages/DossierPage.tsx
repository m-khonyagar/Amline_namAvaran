import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/PageLoader';

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
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['consultant-application'],
    queryFn: async () => {
      const res = await apiClient.get<ApplicationRow | null>('/consultant/application');
      return res.data;
    },
  });

  if (isLoading) {
    return <PageLoader message="در حال بارگذاری پرونده…" />;
  }

  if (isError) {
    return (
      <EmptyState
        title="خطا در دریافت پرونده"
        description="امکان خواندن وضعیت پرونده از سرور نبود. اتصال شبکه را چک کنید و دوباره تلاش کنید."
        action={
          <button
            type="button"
            onClick={() => void refetch()}
            className="min-h-11 rounded-[var(--amline-radius-md)] bg-[var(--amline-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--amline-primary-hover)]"
          >
            تلاش مجدد
          </button>
        }
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="هنوز پرونده‌ای ثبت نشده"
        description="برای بررسی هویت و فعال‌سازی مزایای مشاور، ابتدا فرم ثبت‌نام را تکمیل و ارسال کنید. پس از ارسال، کارشناسان املاین پرونده را بررسی می‌کنند."
        action={
          <Link
            to="/register"
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--amline-radius-md)] bg-[var(--amline-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--amline-primary-hover)]"
          >
            رفتن به ثبت‌نام
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="amline-display text-[var(--amline-fg)]">پروندهٔ حرفه‌ای</h1>
        <p className="amline-body mt-2">
          وضعیت بررسی توسط کارشناسان املاین در پنل پشتیبانی به‌روز می‌شود. در صورت «نیاز به مدارک»، یادداشت کارشناس را
          در همین صفحه ببینید.
        </p>
      </div>
      <div className="rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 shadow-[var(--amline-shadow-sm)] dark:border-slate-700">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="amline-caption">وضعیت</dt>
            <dd className="mt-1 font-semibold text-[var(--amline-fg)]">{ST[data.status] ?? data.status}</dd>
          </div>
          <div>
            <dt className="amline-caption">شهر</dt>
            <dd className="mt-1 text-[var(--amline-fg)]">{data.city}</dd>
          </div>
          <div>
            <dt className="amline-caption">پروانه / نظام کسب</dt>
            <dd className="mt-1 font-mono text-sm text-[var(--amline-fg)]">{data.license_no}</dd>
          </div>
          <div>
            <dt className="amline-caption">آخرین به‌روزرسانی</dt>
            <dd className="mt-1 text-sm text-[var(--amline-fg)]">{new Date(data.updated_at).toLocaleString('fa-IR')}</dd>
          </div>
        </dl>
        {data.reviewer_note ? (
          <div className="mt-4 rounded-[var(--amline-radius-md)] border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
            <span className="font-semibold text-[var(--amline-fg)]">یادداشت کارشناس: </span>
            <span className="text-[var(--amline-fg-muted)]">{data.reviewer_note}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
