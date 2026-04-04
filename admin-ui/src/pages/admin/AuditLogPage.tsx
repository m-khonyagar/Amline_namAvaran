import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../lib/api'
import { apiV1 } from '../../lib/apiPaths'

interface AuditItem {
  id: string
  user_id: string
  action: string
  entity: string
  metadata: Record<string, unknown>
  created_at: string
}

interface AuditListResponse {
  total: number
  items: AuditItem[]
  skip: number
  limit: number
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function auditRowsToCsv(rows: AuditItem[]): string {
  const header = 'id,user_id,action,entity,created_at,metadata_json'
  const lines = rows.map((r) =>
    [
      csvEscape(r.id),
      csvEscape(r.user_id),
      csvEscape(r.action),
      csvEscape(r.entity),
      csvEscape(r.created_at),
      csvEscape(JSON.stringify(r.metadata)),
    ].join(',')
  )
  return [header, ...lines].join('\n')
}

export default function AuditLogPage() {
  const [page, setPage] = useState(0)
  const limit = 20
  const skip = page * limit

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', skip, limit],
    queryFn: async () => {
      const res = await apiClient.get<AuditListResponse>(apiV1('admin/audit'), {
        params: { skip, limit },
      })
      return res.data
    },
  })

  const total = data?.total ?? 0
  const maxPage = Math.max(0, Math.ceil(total / limit) - 1)

  const downloadExport = useCallback(async () => {
    try {
      const cap = Math.min(2000, total || 2000)
      const res = await apiClient.get<AuditListResponse>(apiV1('admin/audit'), {
        params: { skip: 0, limit: cap },
      })
      const csv = auditRowsToCsv(res.data.items)
      const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`خروجی تا ${res.data.items.length} رکورد اول آماده شد`)
    } catch {
      toast.error('خطا در دریافت خروجی')
    }
  }, [total])

  return (
    <div dir="rtl" className="mx-auto max-w-6xl space-y-6 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--amline-border)] pb-6">
        <div>
          <p className="amline-page-eyebrow mb-1">انطباق و امنیت</p>
          <h1 className="amline-title text-[var(--amline-fg)]">لاگ ممیزی</h1>
          <p className="amline-body mt-2 max-w-2xl text-[var(--amline-fg-muted)]">
            رویدادهای ثبت‌شده؛ خروجی CSV برای بازبینی عملیات و انطباق (حداکثر ۲۰۰۰ رکورد اخیر).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void downloadExport()}
          disabled={total === 0}
          className="rounded-amline-md bg-[var(--amline-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          خروجی CSV
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--amline-fg-muted)]">در حال بارگذاری…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface)]">
            <table className="min-w-full text-right text-sm">
              <thead className="border-b border-[var(--amline-border)] bg-[var(--amline-surface-muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium text-[var(--amline-fg)]">زمان</th>
                  <th className="px-4 py-3 font-medium text-[var(--amline-fg)]">کاربر</th>
                  <th className="px-4 py-3 font-medium text-[var(--amline-fg)]">عمل</th>
                  <th className="px-4 py-3 font-medium text-[var(--amline-fg)]">موجودیت</th>
                  <th className="px-4 py-3 font-medium text-[var(--amline-fg)]">جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-[var(--amline-border)]">
                    <td className="whitespace-nowrap px-4 py-2 text-[var(--amline-fg-muted)]">
                      {new Date(row.created_at).toLocaleString('fa-IR')}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-[var(--amline-fg)]">{row.user_id}</td>
                    <td className="px-4 py-2 text-[var(--amline-fg)]">{row.action}</td>
                    <td className="px-4 py-2 text-[var(--amline-fg)]">{row.entity}</td>
                    <td className="max-w-xs truncate px-4 py-2 font-mono text-xs text-[var(--amline-fg-muted)]">
                      {JSON.stringify(row.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-[var(--amline-fg-muted)]">مجموع: {total} رکورد</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-amline-md border border-[var(--amline-border)] px-3 py-1 text-sm disabled:opacity-40"
              >
                قبلی
              </button>
              <button
                type="button"
                disabled={page >= maxPage}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-amline-md border border-[var(--amline-border)] px-3 py-1 text-sm disabled:opacity-40"
              >
                بعدی
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
