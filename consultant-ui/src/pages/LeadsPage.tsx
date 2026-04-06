import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

interface Lead {
  id: string;
  title: string;
  city: string;
  stage: string;
  created_at: string;
}

export default function LeadsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['consultant-leads'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: Lead[]; total: number }>('/consultant/leads');
      return res.data;
    },
  });

  if (isLoading) return <div className="py-12 text-center">…</div>;

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">لیدهای اختصاصی</h1>
      <p className="text-sm text-[var(--amline-fg-muted)]">
        لیدهایی که از کانال املاین (وب، اپ، ربات) به شما تخصیص داده شده‌اند.
      </p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-[var(--amline-fg-muted)]">
          فعلاً لیدی ندارید؛ پس از تأیید پرونده و فعال‌سازی، لیدها اینجا نمایش داده می‌شوند.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4"
            >
              <div>
                <div className="font-medium">{l.title}</div>
                <div className="text-xs text-[var(--amline-fg-muted)]">
                  {l.city} · {l.stage}
                </div>
              </div>
              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-900 dark:bg-teal-950 dark:text-teal-200">
                {l.stage}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
