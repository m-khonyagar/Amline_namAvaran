import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { apiClient } from '../../lib/api'
import { downloadCsv } from '../../lib/exportCsv'
import { TableSkeleton } from '../../components/patterns/TableSkeleton'
import { EmptyState } from '../../components/patterns/EmptyState'

interface WalletRow {
  id: string
  user_id: string
  mobile: string
  balance: number
  currency: string
  status: string
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'فعال',
  FROZEN: 'مسدود',
  PENDING: 'در انتظار',
}

export default function WalletsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['admin-wallets'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: WalletRow[]; total: number }>('/admin/wallets')
      return res.data
    },
  })

  const items = data?.items ?? []
  const filtered = useMemo(() => {
    if (!statusFilter) return items
    return items.filter((w) => w.status === statusFilter)
  }, [items, statusFilter])

  const exportCsv = () => {
    downloadCsv(
      'wallets-export.csv',
      ['شناسه کیف', 'کاربر', 'موبایل', 'موجودی', 'واحد', 'وضعیت'],
      filtered.map((w) => [
        w.id,
        w.user_id,
        w.mobile,
        String(w.balance),
        w.currency,
        STATUS_LABELS[w.status] ?? w.status,
      ])
    )
  }

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(n)

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">کیف پول</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            نمای خلاصه کیف‌های کاربران (mock ادمین).
          </p>
        </div>
        <span className="text-sm text-gray-500">{filtered.length} کیف</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          aria-label="فیلتر وضعیت کیف پول"
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
        <TableSkeleton rows={5} columns={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title="کیفی یافت نشد" description="داده‌ای برای نمایش وجود ندارد یا فیلتر خالی است." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-full text-right text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">موبایل</th>
                <th className="px-4 py-3 font-medium">موجودی</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
                <th className="px-4 py-3 font-medium">شناسه کاربر</th>
                <th className="px-4 py-3 font-medium">شناسه کیف</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="border-b border-gray-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-mono text-xs">{w.mobile}</td>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {fmtMoney(w.balance)} {w.currency === 'IRR' ? 'ریال' : w.currency}
                  </td>
                  <td className="px-4 py-3">{STATUS_LABELS[w.status] ?? w.status}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.user_id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{w.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
