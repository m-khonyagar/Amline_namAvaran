import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/PageLoader';

export default function BenefitsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['consultant-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<{
        profile: { verification_tier: string };
        benefits: { commission_boost_percent: number; crm_priority: boolean; featured_listing_slots: number };
      }>('/consultant/dashboard/summary');
      return res.data;
    },
  });

  if (isLoading) {
    return <PageLoader message="در حال بارگذاری سطح مزایا…" />;
  }

  if (isError || !data) {
    return (
      <EmptyState
        title="اطلاعات مزایا در دسترس نیست"
        description="امکان دریافت وضعیت سطح و کارمزد از سرور نبود. لطفاً بعداً دوباره تلاش کنید."
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

  const tier = data.profile.verification_tier ?? 'NONE';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="amline-display text-[var(--amline-fg)]">مزایا و مدل اعتبار</h1>
        <p className="amline-body mt-2 max-w-2xl">
          هرچه پروندهٔ شفاف‌تر و تأییدشده‌تر باشد، در املاین به لید باکیفیت‌تر، کارمزد ترجیحی و ابزارهای CRM دسترسی
          بهتری خواهید داشت.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <TierCard
          name="پایه"
          code="NONE / BASIC"
          active={tier === 'NONE' || tier === 'BASIC'}
          bullets={['ثبت‌نام و ارسال مدارک', 'دسترسی به قراردادهای استاندارد املاین']}
        />
        <TierCard
          name="تأییدشده"
          code="VERIFIED"
          active={tier === 'VERIFIED'}
          bullets={['افزایش درصد کارمزد همکاری', 'اولویت در صف لیدها', '۱ اسلات آگهی ویژه']}
        />
        <TierCard
          name="ویژه املاین"
          code="PREMIUM"
          active={tier === 'PREMIUM'}
          bullets={['بیشترین افزایش کارمزد', '۳ اسلات آگهی ویژه', 'پشتیبانی اختصاصی']}
        />
      </div>
      <div className="rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 text-sm shadow-[var(--amline-shadow-sm)] dark:border-slate-700">
        <p className="text-[var(--amline-fg)]">
          <span className="font-semibold">وضعیت فعلی شما:</span> سطح {tier} — افزایش کارمزد موثر{' '}
          {data.benefits.commission_boost_percent}٪
        </p>
        <p className="amline-caption mt-2">
          اعداد نمونه‌اند تا API نهایی متصل شود؛ پس از اتصال واقعی، همین بخش به‌صورت زنده به‌روز می‌شود.
        </p>
      </div>
    </div>
  );
}

function TierCard({
  name,
  code,
  active,
  bullets,
}: {
  name: string;
  code: string;
  active: boolean;
  bullets: string[];
}) {
  return (
    <div
      className={`rounded-[var(--amline-radius-lg)] border p-5 transition-shadow ${
        active
          ? 'border-[var(--amline-primary)] shadow-[var(--amline-shadow-md)] ring-2 ring-[var(--amline-primary)]/25 dark:ring-[var(--amline-primary)]/35'
          : 'border-[var(--amline-border)] shadow-[var(--amline-shadow-sm)] dark:border-slate-700'
      } bg-[var(--amline-surface)]`}
    >
      <div className="font-bold text-[var(--amline-fg)]">{name}</div>
      <div className="amline-caption mb-3">{code}</div>
      <ul className="list-inside list-disc space-y-2 amline-body">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}
