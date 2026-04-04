import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { apiV1 } from '../../lib/apiPaths';

type LegalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface LegalReviewItem {
  id: string;
  contract_id: string;
  status: LegalStatus;
  comment: string | null;
  reviewer_id: string | null;
  created_at: string;
  decided_at: string | null;
}

export default function LegalReviewQueuePage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['legal-reviews'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: LegalReviewItem[]; total: number }>(
        apiV1('legal/reviews'),
        { params: { limit: 100 } }
      );
      return res.data;
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      await apiClient.post(apiV1(`legal/reviews/${id}/decide`), {
        approve,
        comment: approve ? 'تأیید از صف ادمین' : 'رد از صف ادمین',
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['legal-reviews'] }),
  });

  return (
    <div dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-[var(--amline-fg)]">صف تأیید حقوقی قرارداد</h1>
        <Link
          to="/contracts/wizard"
          className="rounded-amline-md border border-[var(--amline-border)] px-3 py-2 text-sm hover:bg-[var(--amline-surface-muted)]"
        >
          قرارداد جدید
        </Link>
      </div>
      <p className="text-sm text-[var(--amline-fg-muted)]">
        مطابق Master Spec v2 — پس از امضا، پرونده اینجا صف می‌شود (داده از PostgreSQL؛ در dev خالی ممکن است).
      </p>

      {isLoading ? <p className="text-sm text-[var(--amline-fg-muted)]">در حال بارگذاری…</p> : null}
      {error ? (
        <p className="text-sm text-red-600">
          خطا در بارگذاری — مجوز <code className="rounded bg-red-50 px-1">legal:read</code> و اتصال به API را بررسی کنید.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-amline-md border border-[var(--amline-border)]">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--amline-surface-muted)] text-right">
            <tr>
              <th className="p-3 font-medium">قرارداد</th>
              <th className="p-3 font-medium">وضعیت</th>
              <th className="p-3 font-medium">تاریخ</th>
              <th className="p-3 font-medium">اقدام</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).length === 0 && !isLoading ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-[var(--amline-fg-muted)]">
                  موردی در صف نیست.
                </td>
              </tr>
            ) : null}
            {(data?.items ?? []).map((row) => (
              <tr key={row.id} className="border-t border-[var(--amline-border)]">
                <td className="p-3">
                  <Link
                    to={`/contracts/${row.contract_id}`}
                    className="font-mono text-primary hover:underline"
                  >
                    {row.contract_id}
                  </Link>
                </td>
                <td className="p-3">{row.status}</td>
                <td className="p-3 text-xs text-[var(--amline-fg-muted)]">
                  {row.created_at?.slice(0, 19) ?? '—'}
                </td>
                <td className="p-3">
                  {row.status === 'PENDING' ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: row.id, approve: true })}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs text-white disabled:opacity-50"
                      >
                        تأیید
                      </button>
                      <button
                        type="button"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: row.id, approve: false })}
                        className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-700 disabled:opacity-50"
                      >
                        رد
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--amline-fg-muted)]">تصمیم‌گرفته شد</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
