import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api'
import { formatShamsiDateTime } from '../../lib/persianDateTime'
import { TableSkeleton } from '../../components/patterns/TableSkeleton'
import { EmptyState } from '../../components/patterns/EmptyState'
import type { AdminNotification } from '../../features/notifications/types'

export default function NotificationsInboxPage() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: AdminNotification[]; total?: number }>('/admin/notifications')
      return res.data
    },
  })

  const markOne = useMutation({
    mutationFn: async ({ id, read }: { id: string; read: boolean }) => {
      await apiClient.patch(`/admin/notifications/${id}`, { read })
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  })

  const markAll = useMutation({
    mutationFn: async () => {
      await apiClient.post('/admin/notifications/read-all')
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  })

  const items = data?.items ?? []

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">صندوق ورودی</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            اعلان‌های سیستم؛ خوانده‌شدن با API همگام می‌شود.
          </p>
        </div>
        <button
          type="button"
          disabled={items.length === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-40 dark:border-slate-600"
        >
          علامت‌گذاری همه به‌عنوان خوانده‌شده
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : items.length === 0 ? (
        <EmptyState title="اعلانی وجود ندارد" description="وقتی رویدادی ثبت شود اینجا نمایش داده می‌شود." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="min-w-full text-right text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">عنوان</th>
                <th className="px-4 py-3 font-medium">متن</th>
                <th className="px-4 py-3 font-medium">زمان</th>
                <th className="px-4 py-3 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id} className="border-b border-gray-100 dark:border-slate-800">
                  <td className="px-4 py-3 font-medium">{n.title}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-gray-600 dark:text-slate-400">{n.body ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500 dark:text-slate-500">
                    {n.created_at ? formatShamsiDateTime(n.created_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={markOne.isPending}
                      onClick={() => markOne.mutate({ id: n.id, read: !n.read })}
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-slate-600"
                    >
                      {n.read ? 'علامت خوانده‌نشده' : 'علامت خوانده‌شده'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
