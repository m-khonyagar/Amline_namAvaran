import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '../../lib/api'
import { formatShamsiDateTime } from '../../lib/persianDateTime'
import { TableSkeleton } from '../../components/patterns/TableSkeleton'

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

export default function AuditLogPage() {
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const limit = 20
  const skip = page * limit

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-audit', skip, limit, actionFilter, entityFilter],
    queryFn: async () => {
      const res = await apiClient.get<AuditListResponse>('/admin/audit', {
        params: {
          skip,
          limit,
          ...(actionFilter.trim() ? { action: actionFilter.trim() } : {}),
          ...(entityFilter.trim() ? { entity: entityFilter.trim() } : {}),
        },
      })
      return res.data
    },
  })

  const total = data?.total ?? 0
  const maxPage = Math.max(0, Math.ceil(total / limit) - 1)

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">لاگ ممیزی</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          فیلتر روی عمل و موجودیت (در MSW و backend پشتیبانی شود).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="فیلتر عمل…"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value)
            setPage(0)
          }}
          className="min-w-[160px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        />
        <input
          type="search"
          placeholder="فیلتر موجودیت…"
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value)
            setPage(0)
          }}
          className="min-w-[160px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
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
                      {formatShamsiDateTime(row.created_at)}
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

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              مجموع: {total} رکورد {isFetching ? '…' : ''}
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
