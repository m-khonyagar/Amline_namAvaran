import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api'
import { EmptyState } from '../../components/patterns/EmptyState'
import { TableSkeleton } from '../../components/patterns/TableSkeleton'

type ListResponse = { items: unknown[]; total: number }

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

function cell(v: unknown): string {
  if (v == null) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function CustomInvoicesHamgitPage() {
  const qc = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hamgit', 'admin-custom-invoices-users'],
    queryFn: async () => {
      const res = await apiClient.get<ListResponse>('/admin/custom-invoices/users')
      return res.data
    },
  })

  const linkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ ok?: boolean; link?: string }>('/admin/custom_payment_link', {})
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['hamgit', 'admin-custom-invoices-users'] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-semibold text-[var(--amline-fg)]">فاکتور سفارشی و لینک پرداخت</h1>
        <TableSkeleton rows={5} columns={4} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-[var(--amline-fg)]">فاکتور سفارشی و لینک پرداخت</h1>
        <p className="mt-4 text-red-600 dark:text-red-400">
          خطا در بارگذاری لیست. اتصال به API، dev-mock یا MSW را بررسی کنید.
        </p>
      </div>
    )
  }

  const rawItems = data?.items ?? []
  const items = rawItems.filter(isRecord)

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--amline-fg)]">فاکتور سفارشی و لینک پرداخت</h1>
          <p className="mt-2 text-sm text-[var(--amline-fg-muted)]">
            لینک‌های پرداخت سفارشی ادمین؛ مسیر قدیم:{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">/custom-invoices</code>
          </p>
        </div>
        <button
          type="button"
          disabled={linkMutation.isPending}
          onClick={() => linkMutation.mutate()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          {linkMutation.isPending ? 'در حال درخواست…' : 'درخواست لینک پرداخت (mock)'}
        </button>
      </div>

      {linkMutation.isSuccess && linkMutation.data?.link ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100">
          لینک نمونه:{' '}
          <a href={linkMutation.data.link} className="break-all underline" target="_blank" rel="noreferrer">
            {linkMutation.data.link}
          </a>
        </p>
      ) : null}
      {linkMutation.isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">خطا در ساخت لینک پرداخت.</p>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-medium text-[var(--amline-fg)]">APIهای مرتبط</h2>
        <ul className="space-y-1 font-mono text-xs text-slate-600 dark:text-slate-400">
          <li className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">GET /admin/custom-invoices/users</li>
          <li className="rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">POST /admin/custom_payment_link</li>
        </ul>
      </section>

      {items.length === 0 ? (
        <EmptyState
          title="فاکتور سفارشی ثبت نشده"
          description="با backend کامل یا دادهٔ نمونه در dev-mock / MSW می‌توانید ردیف اضافه کنید."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-2 font-medium">کاربر</th>
                <th className="px-4 py-2 font-medium">مبلغ</th>
                <th className="px-4 py-2 font-medium">وضعیت</th>
                <th className="px-4 py-2 font-medium">شناسه</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={cell(row.id) !== '—' ? String(row.id) : `row-${i}`} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-4 py-2 font-mono text-xs">{cell(row.user_id ?? row.userId)}</td>
                  <td className="px-4 py-2">{cell(row.amount ?? row.value)}</td>
                  <td className="px-4 py-2">{cell(row.status ?? row.state)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{cell(row.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[var(--amline-fg-muted)]">
        جزئیات parity: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">docs/HAMGIT_FEATURES_PARITY.md</code>
      </p>
    </div>
  )
}
