import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useConsultantAuth } from '../hooks/useConsultantAuth';

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
  const { data, isLoading } = useQuery({
    queryKey: ['consultant-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<Summary>('/consultant/dashboard/summary');
      return res.data;
    },
  });

  if (isLoading || !data) {
    return <div className="py-16 text-center text-[var(--amline-fg-muted)]">در حال بارگذاری…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">سلام، {user?.full_name}</h1>
        <p className="text-sm text-[var(--amline-fg-muted)]">
          داشبورد مشاور — الگوی چند‌سطحی املاین (مصرف‌کننده / مشاور / پشتیبانی)
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat title="اعتبار" value={String(data.profile.credit_score)} sub="امتیاز اعتبار املاین" />
        <Stat title="قرارداد فعال" value={String(data.profile.active_contracts_count)} sub="در جریان" />
        <Stat title="لید اختصاصی" value={String(data.profile.assigned_leads_count)} sub="اختصاص داده‌شده" />
        <Stat title="سطح تأیید" value={data.profile.verification_tier} sub={data.profile.application_status} />
      </div>
      <div className="rounded-xl border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5">
        <h2 className="mb-3 font-semibold">مزایای فعال (پس از تأیید پرونده)</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-[var(--amline-fg-muted)]">
          <li>افزایش سهم کارمزد تا {data.benefits.commission_boost_percent}٪ برای سطح تأییدشده</li>
          <li>اولویت نمایش در CRM: {data.benefits.crm_priority ? 'بله' : 'پس از تکمیل پرونده'}</li>
          <li>اسلات آگهی ویژه: {data.benefits.featured_listing_slots}</li>
        </ul>
      </div>
      {data.next_steps.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
          <h2 className="mb-2 font-semibold text-amber-900 dark:text-amber-100">اقدام بعدی</h2>
          {data.next_steps.map((s) => (
            <div key={s.title} className="text-sm">
              <strong>{s.title}</strong> — {s.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4">
      <div className="text-xs text-[var(--amline-fg-muted)]">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="text-xs text-[var(--amline-fg-muted)]">{sub}</div>
    </div>
  );
}
