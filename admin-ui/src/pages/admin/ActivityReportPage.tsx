import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { apiClient } from '../../lib/api'
import { apiV1 } from '../../lib/apiPaths'

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
      const res = await apiClient.get<ActivityResponse>(apiV1('admin/staff/activity'), {
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
    <div dir="rtl" className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--amline-border)] pb-6">
        <div>
          <p className="amline-page-eyebrow mb-1">گزارش‌ها</p>
          <h1 className="amline-title text-[var(--amline-fg)]">گزارش فعالیت کارشناس</h1>
          <p className="amline-body mt-2 max-w-2xl text-[var(--amline-fg-muted)]">
            تجمیع رویداد ممیزی به ازای کاربر و روز (mock / MSW).
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={rows.length === 0}
          className="rounded-amline-md bg-[var(--amline-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          خروجی CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-4 rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--amline-fg-muted)]">از تاریخ</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--amline-fg-muted)]">تا تاریخ</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] px-3 py-2"
          />
        </label>
        <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
          <span className="text-[var(--amline-fg-muted)]">شناسه کاربر (اختیاری)</span>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="mock-001"
            className="rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] px-3 py-2 font-mono text-sm"
          />
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--amline-fg-muted)]">در حال بارگذاری…</p>
      ) : (
        <div className="overflow-x-auto rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface)]">
          <table className="min-w-full text-right text-sm">
            <thead className="border-b border-[var(--amline-border)] bg-[var(--amline-surface-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--amline-fg)]">کاربر</th>
                <th className="px-4 py-3 font-medium text-[var(--amline-fg)]">روز</th>
                <th className="px-4 py-3 font-medium text-[var(--amline-fg)]">تعداد رویداد</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.user_id}-${row.date}`} className="border-b border-[var(--amline-border)]">
                  <td className="px-4 py-2 font-mono text-xs text-[var(--amline-fg)]">{row.user_id}</td>
                  <td className="px-4 py-2 text-[var(--amline-fg)]">{row.date}</td>
                  <td className="px-4 py-2 font-semibold text-[var(--amline-fg)]">{row.event_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--amline-fg-muted)]">داده‌ای برای این فیلتر نیست.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
