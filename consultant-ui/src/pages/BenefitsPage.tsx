import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export default function BenefitsPage() {
  const { data } = useQuery({
    queryKey: ['consultant-dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<{
        profile: { verification_tier: string };
        benefits: { commission_boost_percent: number; crm_priority: boolean; featured_listing_slots: number };
      }>('/consultant/dashboard/summary');
      return res.data;
    },
  });

  const tier = data?.profile.verification_tier ?? 'NONE';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">مزایا و مدل اعتبار</h1>
      <p className="text-sm text-[var(--amline-fg-muted)] max-w-2xl">
        الهام‌گرفته از بهترین تجربه‌های پلتفرم‌های تخصصی مشاور املاک: هرچه پروندهٔ شفاف‌تر و تأییدشده‌تر باشد،
        در املاین به لید باکیفیت‌تر، کارمزد ترجیحی و ابزارهای CRM دسترسی بهتری دارید.
      </p>
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
          bullets={[
            'افزایش درصد کارمزد همکاری',
            'اولویت در صف لیدها',
            '۱ اسلات آگهی ویژه',
          ]}
        />
        <TierCard
          name="ویژه املاین"
          code="PREMIUM"
          active={tier === 'PREMIUM'}
          bullets={['بیشترین افزایش کارمزد', '۳ اسلات آگهی ویژه', 'پشتیبانی اختصاصی']}
        />
      </div>
      {data && (
        <div className="rounded-xl border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 text-sm">
          <strong>وضعیت فعلی شما:</strong> سطح {tier} — افزایش کارمزد موثر{' '}
          {data.benefits.commission_boost_percent}٪
        </div>
      )}
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
      className={`rounded-xl border p-5 ${
        active ? 'border-[var(--amline-primary)] ring-2 ring-teal-200 dark:ring-teal-900' : 'border-[var(--amline-border)]'
      } bg-[var(--amline-surface)]`}
    >
      <div className="font-bold">{name}</div>
      <div className="mb-3 text-xs text-[var(--amline-fg-muted)]">{code}</div>
      <ul className="list-inside list-disc space-y-1 text-sm text-[var(--amline-fg-muted)]">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}
