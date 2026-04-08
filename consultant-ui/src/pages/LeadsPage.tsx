import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/PageLoader';

interface Lead {
  id: string;
  title: string;
  city: string;
  stage: string;
  created_at: string;
}

export default function LeadsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['consultant-leads'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: Lead[]; total: number }>('/consultant/leads');
      return res.data;
    },
  });

  if (isLoading) {
    return <PageLoader message="در حال بارگذاری لیدها…" />;
  }

  if (isError) {
    return (
      <EmptyState
        title="بارگذاری لیدها ناموفق بود"
        description="اتصال به سرور برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره امتحان کنید."
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

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="amline-display text-[var(--amline-fg)]">لیدهای اختصاصی</h1>
        <p className="amline-body mt-2">
          لیدهایی که از کانال املاین (وب، اپ یا ربات) به شما تخصیص داده شده‌اند؛ پس از تأیید پرونده، این فهرست فعال‌تر
          می‌شود.
        </p>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="فعلاً لیدی ندارید"
          description="پس از تأیید پروندهٔ حرفه‌ای و فعال‌سازی سطح مشاور، لیدهای جدید اینجا نمایش داده می‌شوند. وضعیت پرونده را از بخش «پرونده و تأیید» پیگیری کنید."
          action={
            <Link
              to="/dossier"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--amline-radius-md)] border border-[var(--amline-border)] bg-[var(--amline-surface)] px-5 text-sm font-semibold text-[var(--amline-primary)] transition hover:bg-[var(--amline-surface-muted)] dark:border-slate-700"
            >
              مشاهدهٔ پرونده
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((l: Lead) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4 shadow-[var(--amline-shadow-sm)] dark:border-slate-700"
            >
              <div>
                <div className="font-medium text-[var(--amline-fg)]">{l.title}</div>
                <div className="amline-caption mt-1">
                  {l.city} · مرحله: {l.stage}
                </div>
              </div>
              <span className="rounded-full bg-[var(--amline-primary-muted)] px-3 py-1 text-xs font-semibold text-[var(--amline-primary)]">
                {l.stage}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
