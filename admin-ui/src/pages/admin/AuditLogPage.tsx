import { useQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { apiClient } from '../../lib/api'

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
      const res = await apiClient.get<AuditListResponse>('/admin/audit', {
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
      const res = await apiClient.get<AuditListResponse>('/admin/audit', {
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
    <div dir="rtl" className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">لاگ ممیزی</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            رویدادهای ثبت‌شده؛ خروجی CSV برای بازبینی عملیات و انطباق (حداکثر ۲۰۰۰ رکورد اخیر).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void downloadExport()}
          disabled={total === 0}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600"
        >
          خروجی CSV
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">در حال بارگذاری…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <table className="min-w-full text-right text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">زمان</th>
                  <th className="px-4 py-3 font-medium">کاربر</th>
                  <th className="px-4 py-3 font-medium">عمل</th>
                  <th className="px-4 py-3 font-medium">موجودیت</th>
                  <th className="px-4 py-3 font-medium">جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-slate-800">
                    <td className="whitespace-nowrap px-4 py-2 text-gray-600 dark:text-slate-400">
                      {new Date(row.created_at).toLocaleString('fa-IR')}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{row.user_id}</td>
                    <td className="px-4 py-2">{row.action}</td>
                    <td className="px-4 py-2">{row.entity}</td>
                    <td className="max-w-xs truncate px-4 py-2 font-mono text-xs text-gray-500">
                      {JSON.stringify(row.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              مجموع: {total} رکورد
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-600"
              >
                قبلی
              </button>
              <button
                type="button"
                disabled={page >= maxPage}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1 text-sm disabled:opacity-40 dark:border-slate-600"
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
