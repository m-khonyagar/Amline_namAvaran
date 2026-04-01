import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { apiClient } from '../../lib/api'

interface ActivityRow {
  user_id: string
  date: string
  event_count: number
}

interface ActivityResponse {
  items: ActivityRow[]
  total: number
}

function toCsv(rows: ActivityRow[]): string {
  const header = 'user_id,date,event_count'
  const lines = rows.map((r) => `${r.user_id},${r.date},${r.event_count}`)
  return [header, ...lines].join('\n')
}

export default function ActivityReportPage() {
  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(weekAgo)
  const [toDate, setToDate] = useState(today)
  const [userId, setUserId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-staff-activity', fromDate, toDate, userId],
    queryFn: async () => {
      const res = await apiClient.get<ActivityResponse>('/admin/staff/activity', {
        params: {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          user_id: userId.trim() || undefined,
        },
      })
      return res.data
    },
  })

  const rows = data?.items ?? []

  const csvBlob = useMemo(() => {
    const csv = toCsv(rows)
    return new Blob([csv], { type: 'text/csv;charset=utf-8' })
  }, [rows])

  const downloadCsv = () => {
    const url = URL.createObjectURL(csvBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity-${fromDate}-${toDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">گزارش فعالیت کارشناس</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            تجمیع رویداد ممیزی به ازای کاربر و روز (mock).
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={rows.length === 0}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          خروجی CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600 dark:text-slate-400">از تاریخ</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600 dark:text-slate-400">تا تاریخ</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
          <span className="text-gray-600 dark:text-slate-400">شناسه کاربر (اختیاری)</span>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="mock-001"
            className="rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
      </div>

      {isLoading ? (
        <p className="text-gray-500">در حال بارگذاری…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-full text-right text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">کاربر</th>
                <th className="px-4 py-3 font-medium">روز</th>
                <th className="px-4 py-3 font-medium">تعداد رویداد</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.user_id}-${row.date}`} className="border-b border-gray-100 dark:border-slate-800">
                  <td className="px-4 py-2 font-mono text-xs">{row.user_id}</td>
                  <td className="px-4 py-2">{row.date}</td>
                  <td className="px-4 py-2 font-semibold">{row.event_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="p-6 text-center text-gray-500">داده‌ای برای این فیلتر نیست.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
