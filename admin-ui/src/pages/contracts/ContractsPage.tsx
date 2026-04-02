import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { apiClient } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import type { ContractStatus, ContractType } from '../../features/contract-wizard/types/wizard'
import { TableSkeleton } from '../../components/patterns/TableSkeleton'
import { EmptyState } from '../../components/patterns/EmptyState'
import { downloadCsv } from '../../lib/exportCsv'
import { loadView, saveView, clearView } from '../../lib/savedFilters'
import { formatShamsiDate } from '../../lib/persianDateTime'

interface ContractListItem {
  id: string
  type: ContractType
  status: ContractStatus
  created_at: string
  parties?: { full_name?: string }[]
  tracking_code?: string | null
  legal_review_status?: string
}

interface ContractsListResponse {
  items: ContractListItem[]
  total: number
  page: number
  limit: number
}

function partiesAsPreviewList(parties: ContractListItem['parties']): { full_name?: string }[] {
  if (Array.isArray(parties)) return parties
  return []
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

const LEGAL_REVIEW_LABELS: Record<string, string> = {
  NONE: 'بدون بررسی',
  AWAITING_STAFF: 'در انتظار بررسی حقوقی',
  APPROVED: 'تأیید حقوقی',
  REJECTED: 'رد حقوقی',
}

export default function ContractsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('contracts:write')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    const s = loadView('contracts')
    if (s && typeof s.statusFilter === 'string') setStatusFilter(s.statusFilter)
    if (s && typeof s.typeFilter === 'string') setTypeFilter(s.typeFilter)
  }, [])

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
    mutationFn: (id: string) => apiClient.post(`/admin/contracts/${id}/approve`),
    onSuccess: () => {
      toast.success('قرارداد تأیید شد')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => toast.error('خطا در تأیید قرارداد'),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/admin/contracts/${id}/reject`),
    onSuccess: () => {
      toast.success('قرارداد رد شد')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
    onError: () => toast.error('خطا در رد قرارداد'),
  })

  const contractsRaw = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const filteredSorted = useMemo(() => {
    const t = q.trim().toLowerCase()
    let list = contractsRaw
    if (t) {
      list = list.filter((c) => {
        if (c.id.toLowerCase().includes(t)) return true
        const tc = (c.tracking_code ?? '').toLowerCase()
        if (tc && tc.includes(t)) return true
        const names = partiesAsPreviewList(c.parties)
          .map((p) => (p.full_name ?? '').toLowerCase())
          .join(' ')
        return names.includes(t)
      })
    }
    const sorted = [...list]
    sorted.sort((a, b) => {
      const ca = new Date(a.created_at).getTime()
      const cb = new Date(b.created_at).getTime()
      return sortAsc ? ca - cb : cb - ca
    })
    return sorted
  }, [contractsRaw, q, sortAsc])

  const exportCsvFn = () => {
    if (filteredSorted.length === 0) return
    downloadCsv(
      `contracts-page-${page}`,
      ['شناسه', 'کد رهگیری', 'نوع', 'وضعیت', 'بررسی حقوقی', 'تاریخ'],
      filteredSorted.map((c) => [
        c.id,
        c.tracking_code ?? '—',
        TYPE_LABELS[c.type] ?? c.type,
        STATUS_LABELS[c.status] ?? c.status,
        LEGAL_REVIEW_LABELS[c.legal_review_status ?? 'NONE'] ?? (c.legal_review_status ?? '—'),
        formatShamsiDate(c.created_at),
      ])
    )
  }

  return (
    <div dir="rtl" className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">قراردادها</h1>
        {canCreate ? (
          <button
            type="button"
            onClick={() => navigate('/contracts/wizard')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + قرارداد جدید
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="جستجو در شناسه، کد رهگیری یا نام طرف‌ها..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">همه انواع</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setSortAsc((v) => !v)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600"
        >
          تاریخ: {sortAsc ? 'قدیمی‌ترین اول' : 'جدیدترین اول'}
        </button>
        <button
          type="button"
          onClick={() => saveView('contracts', { statusFilter, typeFilter })}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600"
        >
          ذخیرهٔ نمای فعلی
        </button>
        <button
          type="button"
          onClick={() => clearView('contracts')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600"
        >
          پاک کردن نمای ذخیره‌شده
        </button>
        <button
          type="button"
          onClick={exportCsvFn}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          خروجی CSV
        </button>
      </div>

      {isLoading && <TableSkeleton rows={6} columns={8} />}

      {isError && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-950/40 dark:text-red-300">خطا در دریافت قراردادها</div>
      )}

      {!isLoading && !isError && filteredSorted.length === 0 ? (
        <EmptyState
          title="قراردادی در این صفحه نیست"
          description="فیلترها یا جستجو را تغییر دهید."
          action={
            canCreate ? (
              <button
                type="button"
                onClick={() => navigate('/contracts/wizard')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
              >
                شروع قرارداد جدید
              </button>
            ) : undefined
          }
        />
      ) : null}

      {!isLoading && !isError && filteredSorted.length > 0 && (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">شناسه</th>
                  <th className="px-4 py-3 text-right font-medium">کد رهگیری</th>
                  <th className="px-4 py-3 text-right font-medium">طرفین</th>
                  <th className="px-4 py-3 text-right font-medium">نوع</th>
                  <th className="px-4 py-3 text-right font-medium">وضعیت</th>
                  <th className="px-4 py-3 text-right font-medium">حقوقی</th>
                  <th className="px-4 py-3 text-right font-medium">تاریخ</th>
                  <th className="px-4 py-3 text-right font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredSorted.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-slate-400">{c.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-slate-300">
                      {c.tracking_code ?? '—'}
                    </td>
                    <td
                      className="max-w-[10rem] truncate px-4 py-3 text-gray-600 dark:text-slate-300"
                      title={partiesAsPreviewList(c.parties)
                        .map((p) => p.full_name)
                        .filter(Boolean)
                        .join('، ')}
                    >
                      {partiesAsPreviewList(c.parties)
                        .map((p) => p.full_name)
                        .filter(Boolean)
                        .join('، ') || '—'}
                    </td>
                    <td className="px-4 py-3 dark:text-slate-200">{TYPE_LABELS[c.type] ?? c.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : c.status === 'PENDING_ADMIN_APPROVAL'
                              ? 'bg-yellow-100 text-yellow-700'
                              : c.status === 'ADMIN_REJECTED' || c.status === 'REVOKED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.legal_review_status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.legal_review_status === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : c.legal_review_status === 'AWAITING_STAFF'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {LEGAL_REVIEW_LABELS[c.legal_review_status ?? 'NONE'] ?? c.legal_review_status ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">
                      {formatShamsiDate(c.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/contracts/${c.id}`)}
                          className="rounded px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          مشاهده
                        </button>
                        {c.status === 'PENDING_ADMIN_APPROVAL' && (
                          <>
                            <button
                              type="button"
                              onClick={() => approveMutation.mutate(c.id)}
                              disabled={approveMutation.isPending}
                              className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              تأیید
                            </button>
                            <button
                              type="button"
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
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded px-3 py-1 text-sm disabled:opacity-40"
              >
                قبلی
              </button>
              <span className="text-sm text-gray-600 dark:text-slate-400">
                صفحه {page} از {totalPages}
              </span>
              <button
                type="button"
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
