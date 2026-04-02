import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { apiClient } from '../../lib/api'
import { formatShamsiDate } from '../../lib/persianDateTime'
import { downloadCsv } from '../../lib/exportCsv'
import { TableSkeleton } from '../../components/patterns/TableSkeleton'
import { EmptyState } from '../../components/patterns/EmptyState'

interface AdRow {
  id: string
  title: string
  status: string
  city?: string
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: 'منتشر شده',
  DRAFT: 'پیش‌نویس',
  ARCHIVED: 'آرشیو',
}

export default function AdsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: AdRow[]; total: number }>('/admin/ads')
      return res.data
    },
  })

  const items = data?.items ?? []
  const filtered = useMemo(() => {
    if (!statusFilter) return items
    return items.filter((a) => a.status === statusFilter)
  }, [items, statusFilter])

  const exportCsv = () => {
    downloadCsv(
      'ads-export.csv',
      ['شناسه', 'عنوان', 'وضعیت', 'شهر', 'تاریخ'],
      filtered.map((a) => [
        a.id,
        a.title,
        STATUS_LABELS[a.status] ?? a.status,
        a.city ?? '',
        formatShamsiDate(a.created_at),
      ])
    )
  }

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">آگهی‌ها</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            لیست آگهی‌ها از API ادمین (mock با MSW).
          </p>
        </div>
        <span className="text-sm text-gray-500">{filtered.length} مورد</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="فیلتر وضعیت آگهی"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 hover:bg-emerald-700"
        >
          خروجی CSV
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title="آگهی‌ای نیست" description="با فیلتر دیگری امتحان کنید یا بعداً دوباره مراجعه کنید." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-full text-right text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">عنوان</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">شهر</th>
                <th className="px-4 py-3 font-medium">تاریخ</th>
                <th className="px-4 py-3 font-medium">شناسه</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium">{a.title}</td>
                  <td className="px-4 py-3">{STATUS_LABELS[a.status] ?? a.status}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{a.city ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                    {formatShamsiDate(a.created_at)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
