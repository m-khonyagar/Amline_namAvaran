import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { TableSkeleton } from '../../components/patterns/TableSkeleton'
import { EmptyState } from '../../components/patterns/EmptyState'
import type { ConsultantApplicationRow, ConsultantApplicationStatus } from '../../types/consultant'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'ارسال‌شده',
  UNDER_REVIEW: 'در حال بررسی',
  APPROVED: 'تأیید شده',
  REJECTED: 'رد شده',
  NEEDS_INFO: 'نیاز به تکمیل',
}

interface ListResponse {
  items: ConsultantApplicationRow[]
  total: number
}

export default function ConsultantsReviewPage() {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission('consultants:write')
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})

  const { data, isLoading, isError } = useQuery({
    queryKey: ['consultant-applications', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      const res = await apiClient.get<ListResponse>('/admin/consultants/applications', { params })
      return res.data
    },
  })

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      reviewer_note,
    }: {
      id: string
      status: ConsultantApplicationStatus
      reviewer_note?: string
    }) => {
      await apiClient.patch(`/admin/consultants/applications/${id}`, { status, reviewer_note })
    },
    onSuccess: () => {
      toast.success('وضعیت پرونده به‌روز شد')
      queryClient.invalidateQueries({ queryKey: ['consultant-applications'] })
    },
    onError: () => toast.error('خطا در ذخیره'),
  })

  const rows = data?.items ?? []

  return (
    <div dir="rtl" className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">پروندهٔ مشاوران املاک</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
          ثبت‌نام، ارسال مدارک و تأیید نهایی توسط کارشناسان املاین — همگام با پنل مشاور.
        </p>
      </div>

      <div className="mb-4">
        <select
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
      </div>

      {isLoading && <TableSkeleton rows={5} columns={6} />}
      {isError && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300">
          خطا در دریافت لیست پرونده‌ها
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 ? (
        <EmptyState title="پرونده‌ای نیست" description="فیلتر را تغییر دهید یا بعداً مرور کنید." />
      ) : null}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-3 py-3 text-right font-medium">نام</th>
                <th className="px-3 py-3 text-right font-medium">موبایل</th>
                <th className="px-3 py-3 text-right font-medium">شهر</th>
                <th className="px-3 py-3 text-right font-medium">پروانه</th>
                <th className="px-3 py-3 text-right font-medium">وضعیت</th>
                <th className="px-3 py-3 text-right font-medium">اقدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.id} className="align-top hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-3">
                    <div className="font-medium dark:text-slate-100">{r.full_name}</div>
                    {r.agency_name ? (
                      <div className="text-xs text-gray-500 dark:text-slate-400">{r.agency_name}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{r.mobile}</td>
                  <td className="px-3 py-3">{r.city}</td>
                  <td className="px-3 py-3 text-xs">{r.license_no}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-slate-700">
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    {r.reviewer_note ? (
                      <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">{r.reviewer_note}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      rows={2}
                      placeholder="یادداشت کارشناس..."
                      value={noteDraft[r.id] ?? ''}
                      onChange={(e) => setNoteDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                      className="mb-2 w-full rounded border border-gray-200 px-2 py-1 text-xs dark:border-slate-600 dark:bg-slate-950"
                    />
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={!canWrite || patchMutation.isPending}
                        onClick={() =>
                          patchMutation.mutate({
                            id: r.id,
                            status: 'UNDER_REVIEW',
                            reviewer_note: noteDraft[r.id],
                          })
                        }
                        className="rounded bg-slate-600 px-2 py-1 text-xs text-white"
                      >
                        در حال بررسی
                      </button>
                      <button
                        type="button"
                        disabled={!canWrite || patchMutation.isPending}
                        onClick={() =>
                          patchMutation.mutate({
                            id: r.id,
                            status: 'APPROVED',
                            reviewer_note: noteDraft[r.id],
                          })
                        }
                        className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
                      >
                        تأیید
                      </button>
                      <button
                        type="button"
                        disabled={!canWrite || patchMutation.isPending}
                        onClick={() =>
                          patchMutation.mutate({
                            id: r.id,
                            status: 'NEEDS_INFO',
                            reviewer_note: noteDraft[r.id],
                          })
                        }
                        className="rounded bg-amber-600 px-2 py-1 text-xs text-white"
                      >
                        نیاز به مدارک
                      </button>
                      <button
                        type="button"
                        disabled={!canWrite || patchMutation.isPending}
                        onClick={() =>
                          patchMutation.mutate({
                            id: r.id,
                            status: 'REJECTED',
                            reviewer_note: noteDraft[r.id],
                          })
                        }
                        className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                      >
                        رد
                      </button>
                    </div>
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
