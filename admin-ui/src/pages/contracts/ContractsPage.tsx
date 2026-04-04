import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { toast } from 'sonner'
import { apiClient } from '../../lib/api'
import type { ContractStatus, ContractType } from '../../features/contract-wizard/types/wizard'

interface ContractListItem {
  id: string
  type: ContractType
  status: ContractStatus
  created_at: string
  parties?: { full_name?: string }[]
}

interface ContractsListResponse {
  items: ContractListItem[]
  total: number
  page: number
  limit: number
}

const STATUS_LABELS: Record<string, string> = {
  ADMIN_STARTED: 'شروع شده توسط ادمین',
  DRAFT: 'پیش‌نویس',
  ONE_PARTY_SIGNED: 'یک طرف امضا کرده',
  FULLY_SIGNED: 'همه امضا کرده‌اند',
  LANDLORDS_FULLY_SIGNED: 'موجر امضا کرده',
  TENANTS_FULLY_SIGNED: 'مستأجر امضا کرده',
  ACTIVE: 'فعال',
  PENDING_COMMISSION: 'در انتظار کمیسیون',
  EDIT_REQUESTED: 'درخواست ویرایش',
  PARTY_REJECTED: 'رد شده توسط طرف',
  PENDING_ADMIN_APPROVAL: 'در انتظار تأیید ادمین',
  ADMIN_REJECTED: 'رد شده توسط ادمین',
  COMPLETED: 'تکمیل شده',
  REVOKED: 'فسخ شده',
  PDF_GENERATED: 'PDF تولید شده',
  PDF_GENERATING_FAILED: 'خطا در تولید PDF',
}

const TYPE_LABELS: Record<string, string> = {
  PROPERTY_RENT: 'رهن و اجاره',
  BUYING_AND_SELLING: 'خرید و فروش',
}

export default function ContractsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const typeFilter = searchParams.get('type') ?? ''
  const [page, setPage] = useState(1)

  function setTypeFilter(next: string) {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (next) p.set('type', next)
        else p.delete('type')
        return p
      },
      { replace: true }
    )
    setPage(1)
  }

  const { data, isLoading, isError } = useQuery<ContractsListResponse>({
    queryKey: ['contracts', statusFilter, typeFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 }
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      const res = await apiClient.get<ContractsListResponse>('/contracts/list', { params })
      return res.data
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/admin/contracts/${id}/approve`),
    onSuccess: () => {
      toast.success('قرارداد تأیید شد')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => toast.error('خطا در تأیید قرارداد'),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/admin/contracts/${id}/reject`),
    onSuccess: () => {
      toast.success('قرارداد رد شد')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => toast.error('خطا در رد قرارداد'),
  })

  const contracts = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div dir="rtl" className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">قراردادها</h1>
        {hasPermission('contracts:write') ? (
          <button
            type="button"
            onClick={() => navigate('/contracts/wizard')}
            className="rounded-lg bg-[var(--amline-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--amline-primary-hover)]"
          >
            + قرارداد جدید
          </button>
        ) : null}
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">همه انواع</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">خطا در دریافت قراردادها</div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">شناسه</th>
                  <th className="px-4 py-3 text-right font-medium">نوع</th>
                  <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                  <th className="px-4 py-3 text-right font-medium">تاریخ</th>
                  <th className="px-4 py-3 text-right font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contracts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      قراردادی یافت نشد
                    </td>
                  </tr>
                )}
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {c.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">{TYPE_LABELS[c.type] ?? c.type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        c.status === 'PENDING_ADMIN_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                        c.status === 'ADMIN_REJECTED' || c.status === 'REVOKED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(c.created_at).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/contracts/${c.id}`)}
                          className="rounded px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        >
                          مشاهده
                        </button>
                        {c.status === 'PENDING_ADMIN_APPROVAL' && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate(c.id)}
                              disabled={approveMutation.isPending}
                              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              تأیید
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(c.id)}
                              disabled={rejectMutation.isPending}
                              className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              رد
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded px-3 py-1 text-sm disabled:opacity-40"
              >
                قبلی
              </button>
              <span className="text-sm text-gray-600">
                صفحه {page} از {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded px-3 py-1 text-sm disabled:opacity-40"
              >
                بعدی
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
