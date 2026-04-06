import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { EmptyState } from '../../components/patterns/EmptyState'
import { TableSkeleton } from '../../components/patterns/TableSkeleton'

interface PRContractRow {
  id: string
  title?: string
  status?: string
  created_at?: string
}

export default function PRContractsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-pr-contracts-list'],
    queryFn: async () => {
      const res = await apiClient.get<{
        items: PRContractRow[]
        total: number
      }>('/admin/pr-contracts/list')
      return res.data
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">قراردادهای PR</h1>
        <TableSkeleton rows={5} columns={4} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">قراردادهای PR</h1>
        <p className="mt-4 text-red-600 dark:text-red-400">خطا در بارگذاری لیست. اتصال به API یا dev-mock را بررسی کنید.</p>
      </div>
    )
  }

  const items = data?.items ?? []

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">قراردادهای PR</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            مسیر Hamgit قدیمی (<code className="rounded bg-slate-100 px-1 dark:bg-slate-800">/admin/pr-contracts/*</code>)؛
            در این نسخه ابتدا لیست و هم‌ترازی mock انجام شده است.
          </p>
        </div>
        <Link
          to="/contracts/wizard"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          قرارداد جدید (ویزارد)
        </Link>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="قرارداد PR ثبت نشده"
          description="با backend کامل Hamgit یا دادهٔ نمونه در dev-mock می‌توانید ردیف اضافه کنید."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-right text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-2 font-medium">شناسه</th>
                <th className="px-4 py-2 font-medium">عنوان</th>
                <th className="px-4 py-2 font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-slate-200 dark:border-slate-700">
                  <td className="px-4 py-2 font-mono text-xs">{row.id}</td>
                  <td className="px-4 py-2">{row.title ?? '—'}</td>
                  <td className="px-4 py-2">{row.status ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
