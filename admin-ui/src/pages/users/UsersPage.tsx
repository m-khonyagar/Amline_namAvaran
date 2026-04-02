import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, TrendingUp, MessageCircle, Phone, FileCheck, Wallet, AlertCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { apiClient } from '../../lib/api'
import { TableSkeleton } from '../../components/patterns/TableSkeleton'
import { EmptyState } from '../../components/patterns/EmptyState'
import { downloadCsv } from '../../lib/exportCsv'
import { loadView, saveView, clearView } from '../../lib/savedFilters'
import { BulkImportUsersModal } from './BulkImportUsersModal'
import { formatShamsiDate, formatShamsiDateTime } from '../../lib/persianDateTime'

interface UserListItem {
  id: string
  mobile: string
  full_name?: string
  role: string
  created_at: string
  last_login?: string
  is_active: boolean
  verification_status?: string
  wallet_balance?: number
  tags?: string[]
}

interface UsersListResponse {
  items: UserListItem[]
  total: number
  page: number
  limit: number
}

interface UsersAnalytics {
  new_registrations_30d: number
  active_users_7d: number
  chat_sessions_30d: number
  voice_calls_30d: number
  contracts_completed_30d: number
  commissions_paid_30d: number
  pending_verifications: number
  open_tickets: number
  total_users: number
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدیر',
  user: 'کاربر',
  realtor: 'مشاور',
  accountant: 'حسابدار',
}

const VERIFY_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  VERIFIED: 'تأیید شده',
  REJECTED: 'رد شده',
  MANUAL_REVIEW: 'بررسی دستی',
}

const VERIFY_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
  VERIFIED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
  MANUAL_REVIEW: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200',
}

type SortKey = 'full_name' | 'mobile' | 'role' | 'created_at' | 'last_login' | 'wallet_balance'

function fmtMoney(n: number) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 }).format(n)
}

export default function UsersPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission('users:write')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [verificationFilter, setVerificationFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const saved = loadView('users')
    if (saved && typeof saved.search === 'string') setSearch(saved.search)
    if (saved && typeof saved.roleFilter === 'string') setRoleFilter(saved.roleFilter)
    if (saved && typeof saved.verificationFilter === 'string') setVerificationFilter(saved.verificationFilter)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics-users'],
    queryFn: async () => {
      const res = await apiClient.get<UsersAnalytics>('/admin/analytics/users-summary')
      return res.data
    },
  })

  const { data, isLoading, isError } = useQuery<UsersListResponse>({
    queryKey: ['users', debouncedSearch, roleFilter, verificationFilter, activeFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 }
      if (debouncedSearch) params.search = debouncedSearch
      if (roleFilter) params.role = roleFilter
      if (verificationFilter) params.verification_status = verificationFilter
      if (activeFilter === 'active') params.is_active = 'true'
      if (activeFilter === 'inactive') params.is_active = 'false'
      const res = await apiClient.get<UsersListResponse>('/admin/users', { params })
      return res.data
    },
  })

  const users = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const sortedUsers = useMemo(() => {
    const arr = [...users]
    arr.sort((a, b) => {
      const key = sortKey
      let av: string | number = (a[key] ?? '') as string | number
      let bv: string | number = (b[key] ?? '') as string | number
      if (key === 'wallet_balance') {
        av = a.wallet_balance ?? 0
        bv = b.wallet_balance ?? 0
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortAsc ? av - bv : bv - av
      }
      const c = String(av).localeCompare(String(bv), 'fa')
      return sortAsc ? c : -c
    })
    return arr
  }, [users, sortKey, sortAsc])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((v) => !v)
    else {
      setSortKey(k)
      setSortAsc(k === 'full_name' || k === 'mobile')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const selectAllPage = useCallback(() => {
    setSelectedIds(new Set(sortedUsers.map((u) => u.id)))
  }, [sortedUsers])

  const clearSelection = () => setSelectedIds(new Set())

  const exportRows = () => {
    const list =
      selectedIds.size > 0 ? sortedUsers.filter((u) => selectedIds.has(u.id)) : sortedUsers
    if (list.length === 0) return
    downloadCsv(
      `users-page-${page}`,
      ['نام', 'موبایل', 'نقش', 'احراز', 'فعال', 'موجودی', 'آخرین لاگین'],
      list.map((u) => [
        u.full_name ?? '',
        u.mobile,
        ROLE_LABELS[u.role] ?? u.role,
        VERIFY_LABELS[u.verification_status ?? ''] ?? u.verification_status ?? '',
        u.is_active ? 'بله' : 'خیر',
        u.wallet_balance != null ? String(u.wallet_balance) : '',
        u.last_login ? formatShamsiDate(u.last_login) : '',
      ])
    )
  }

  const saveCurrentView = () => {
    saveView('users', { search, roleFilter, verificationFilter })
  }

  return (
    <div dir="rtl" className="min-h-0 space-y-8 p-4 sm:p-6">
      <BulkImportUsersModal open={bulkOpen} onClose={() => setBulkOpen(false)} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Users className="h-8 w-8" aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              مدیریت کاربران
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            پروفایل، احراز هویت، سوابق، کیف و تیکت — با آمار عملیاتی املاین.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite ? (
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" />
              ورود دسته‌ای (Excel)
            </button>
          ) : null}
        </div>
      </div>

      {analytics ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900/80">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">ثبت‌نام ۳۰ روز</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {fmtMoney(analytics.new_registrations_30d)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-blue-50/50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-blue-950/20">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">فعال ۷ روز</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {fmtMoney(analytics.active_users_7d)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-violet-50/50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-violet-950/20">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">گفتگو / چت ۳۰ روز</span>
              <MessageCircle className="h-4 w-4 text-violet-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {fmtMoney(analytics.chat_sessions_30d)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-cyan-50/50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-cyan-950/20">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">تماس صوتی ۳۰ روز</span>
              <Phone className="h-4 w-4 text-cyan-500" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {fmtMoney(analytics.voice_calls_30d)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-amber-50/50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-amber-950/20 sm:col-span-2 lg:col-span-1 xl:col-span-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">قرارداد نهایی ۳۰ روز</span>
              <FileCheck className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {fmtMoney(analytics.contracts_completed_30d)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-emerald-50/50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-emerald-950/20">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">کارمزد پرداخت‌شده ۳۰ روز (ریال)</span>
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {fmtMoney(analytics.commissions_paid_30d)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-medium">احراز در انتظار</span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
              {analytics.pending_verifications}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">تیکت باز</span>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{analytics.open_tickets}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-900 p-4 text-white shadow-lg dark:border-slate-600">
            <span className="text-xs font-medium text-slate-300">کل کاربران</span>
            <p className="mt-2 text-2xl font-bold">{fmtMoney(analytics.total_users)}</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <input
          type="search"
          placeholder="جستجو: نام، موبایل، ایمیل…"
          aria-label="جستجوی کاربران"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none ring-indigo-500/20 focus:ring-2 dark:border-slate-600 dark:bg-slate-900"
        />
        <select
          aria-label="فیلتر نقش"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">همه نقش‌ها</option>
          {Object.entries(ROLE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="فیلتر وضعیت احراز"
          value={verificationFilter}
          onChange={(e) => {
            setVerificationFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">همه وضعیت‌های احراز</option>
          {Object.entries(VERIFY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="فیلتر فعال بودن"
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-900"
        >
          <option value="">همه</option>
          <option value="active">فقط فعال</option>
          <option value="inactive">غیرفعال</option>
        </select>
        <button
          type="button"
          onClick={saveCurrentView}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600"
        >
          ذخیرهٔ نما
        </button>
        <button
          type="button"
          onClick={() => clearView('users')}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-600"
        >
          پاک کردن نما
        </button>
        <button
          type="button"
          onClick={exportRows}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          خروجی CSV
        </button>
      </div>

      {selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-indigo-50 px-4 py-2 text-sm dark:bg-indigo-950/40">
          <span className="font-medium text-indigo-900 dark:text-indigo-100">{selectedIds.size} انتخاب‌شده</span>
          <button type="button" className="text-indigo-700 underline dark:text-indigo-300" onClick={selectAllPage}>
            همه در صفحه
          </button>
          <button type="button" className="text-indigo-700 underline dark:text-indigo-300" onClick={clearSelection}>
            لغو
          </button>
        </div>
      ) : null}

      {isLoading && <TableSkeleton rows={8} columns={8} />}
      {isError && (
        <div className="rounded-xl bg-red-50 p-4 text-red-800 dark:bg-red-950/50 dark:text-red-200">
          خطا در دریافت کاربران
        </div>
      )}

      {!isLoading && !isError && sortedUsers.length === 0 ? (
        <EmptyState title="کاربری یافت نشد" description="فیلترها را تغییر دهید یا ورود دسته‌ای امتحان کنید." />
      ) : null}

      {!isLoading && !isError && sortedUsers.length > 0 && (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-slate-50/90 text-slate-600 dark:bg-slate-800/90 dark:text-slate-300">
                  <tr>
                    <th className="w-10 px-2 py-3">
                      <span className="sr-only">انتخاب</span>
                    </th>
                    {(
                      [
                        ['full_name', 'نام', true],
                        ['mobile', 'موبایل', true],
                        ['role', 'نقش', true],
                        ['verification', 'احراز', false],
                        ['is_active', 'وضعیت', false],
                        ['wallet_balance', 'موجودی', true],
                        ['last_login', 'آخرین ورود', true],
                      ] as const
                    ).map(([key, label, sortable]) => (
                      <th key={key} className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                        {sortable ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400"
                            onClick={() => toggleSort(key as SortKey)}
                          >
                            {label}
                            {sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : ''}
                          </button>
                        ) : (
                          <span>{label}</span>
                        )}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-right text-xs font-semibold">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedUsers.map((u) => {
                    const v = u.verification_status ?? 'PENDING'
                    return (
                      <tr
                        key={u.id}
                        className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-2 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(u.id)}
                            onChange={() => toggleSelect(u.id)}
                            aria-label={`انتخاب ${u.full_name ?? u.mobile}`}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{u.full_name ?? '—'}</div>
                          {u.tags && u.tags.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {u.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-600 dark:text-slate-400">{u.mobile}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-200">
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${VERIFY_STYLES[v] ?? 'bg-slate-100 text-slate-700'}`}
                          >
                            {VERIFY_LABELS[v] ?? v}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={
                              u.is_active
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-400 line-through'
                            }
                          >
                            {u.is_active ? 'فعال' : 'غیرفعال'}
                          </span>
                        </td>
                        <td className="px-3 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                          {u.wallet_balance != null ? `${fmtMoney(u.wallet_balance)} ر` : '—'}
                        </td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                          {u.last_login ? formatShamsiDateTime(u.last_login) : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/users/${u.id}`)}
                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                          >
                            پروفایل کامل
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40 dark:border-slate-600"
              >
                قبلی
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                صفحه {page} از {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40 dark:border-slate-600"
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
