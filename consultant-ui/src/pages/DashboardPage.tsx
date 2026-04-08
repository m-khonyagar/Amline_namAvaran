import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useConsultantAuth } from '../hooks/useConsultantAuth';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/PageLoader';

interface Summary {
  profile: {
    credit_score: number;
    active_contracts_count: number;
    assigned_leads_count: number;
    verification_tier: string;
    application_status: string;
  };
  benefits: {
    commission_boost_percent: number;
    crm_priority: boolean;
    featured_listing_slots: number;
  };
  next_steps: Array<{ title: string; description: string }>;
}

export default function DashboardPage() {
  const { user } = useConsultantAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['consultant-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<Summary>('/consultant/dashboard/summary');
      return res.data;
    },
  });

  if (isLoading) {
    return <PageLoader message="در حال بارگذاری داشبورد…" />;
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="بارگذاری داشبورد ناموفق بود"
        description="اتصال اینترنت یا دسترسی به سرور را بررسی کنید. اگر مشکل ادامه داشت، بعداً دوباره امتحان کنید."
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="amline-display text-[var(--amline-fg)]">سلام، {user?.full_name}</h1>
        <p className="amline-body mt-2">
          داشبورد مشاور املاین — وضعیت اعتبار، قراردادها و لیدهای اختصاصی شما در یک نگاه.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="اعتبار" value={String(data.profile.credit_score)} sub="امتیاز اعتبار املاین" />
        <Stat title="قرارداد فعال" value={String(data.profile.active_contracts_count)} sub="در جریان" />
        <Stat title="لید اختصاصی" value={String(data.profile.assigned_leads_count)} sub="اختصاص داده‌شده" />
        <Stat title="سطح تأیید" value={data.profile.verification_tier} sub={data.profile.application_status} />
      </div>
      <div className="rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 shadow-[var(--amline-shadow-sm)] dark:border-slate-700">
        <h2 className="amline-title mb-3">مزایای فعال (پس از تأیید پرونده)</h2>
        <ul className="list-inside list-disc space-y-2 amline-body">
          <li>افزایش سهم کارمزد تا {data.benefits.commission_boost_percent}٪ برای سطح تأییدشده</li>
          <li>اولویت نمایش در CRM: {data.benefits.crm_priority ? 'بله' : 'پس از تکمیل پرونده'}</li>
          <li>اسلات آگهی ویژه: {data.benefits.featured_listing_slots}</li>
        </ul>
      </div>
      {data.next_steps.length > 0 ? (
        <div className="rounded-[var(--amline-radius-lg)] border border-amber-200 bg-[var(--amline-warning-muted)] p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <h2 className="amline-title mb-3 text-amber-950 dark:text-amber-100">اقدام بعدی پیشنهادی</h2>
          <ul className="space-y-4">
            {data.next_steps.map((s: { title: string; description: string }) => (
              <li key={s.title}>
                <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90">{s.description}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/60 px-5 py-4 text-center dark:border-slate-700">
          <p className="amline-body text-[var(--amline-fg-muted)]">
            در حال حاضر اقدام اجباری روی حساب شما ثبت نشده است. از منوی «لیدهای من» و «پرونده» پیگیری کنید.
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4 shadow-[var(--amline-shadow-sm)] dark:border-slate-700">
      <div className="amline-caption">{title}</div>
      <div className="mt-1 text-2xl font-bold text-[var(--amline-fg)]">{value}</div>
      <div className="amline-caption mt-0.5">{sub}</div>
    </div>
  );
}
