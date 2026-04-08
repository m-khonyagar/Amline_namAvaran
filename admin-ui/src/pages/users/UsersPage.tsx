import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { apiV1 } from '../../lib/apiPaths'

interface UserListItem {
  id: string
  mobile: string
  full_name?: string
  role: string
  created_at: string
  last_login?: string
  is_active: boolean
}

interface UsersListResponse {
  items: UserListItem[]
  total: number
  page: number
  limit: number
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدیر',
  user: 'کاربر',
  realtor: 'مشاور',
  accountant: 'حسابدار',
}

export default function UsersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const { data, isLoading, isError } = useQuery<UsersListResponse>({
    queryKey: ['users', debouncedSearch, roleFilter, page],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 }
      if (debouncedSearch) params.search = debouncedSearch
      if (roleFilter) params.role = roleFilter
      const res = await apiClient.get<UsersListResponse>(apiV1('admin/users'), { params })
      return res.data
    },
  })

  const users = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div dir="rtl" className="p-6 text-[var(--amline-fg)]">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--amline-fg)]">کاربران</h1>
        <span className="text-sm text-[var(--amline-fg-muted)]">{total} کاربر</span>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <input
          type="text"
          placeholder="جستجو در نام یا موبایل..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] px-3 py-2 text-sm text-[var(--amline-fg)] placeholder:text-[var(--amline-fg-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--amline-ring)] dark:border-slate-600"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="rounded-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] px-3 py-2 text-sm text-[var(--amline-fg)] dark:border-slate-600"
        >
          <option value="">همه نقش‌ها</option>
          {Object.entries(ROLE_LABELS).map(([val, label]) => (
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          خطا در دریافت کاربران
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="overflow-hidden rounded-lg border border-[var(--amline-border)] bg-[var(--amline-surface)] shadow-sm dark:border-slate-600">
            <table className="w-full text-sm">
              <thead className="bg-[var(--amline-surface-muted)] text-[var(--amline-fg-muted)]">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">نام</th>
                  <th className="px-4 py-3 text-right font-medium">موبایل</th>
                  <th className="px-4 py-3 text-right font-medium">نقش</th>
                  <th className="px-4 py-3 text-right font-medium">آخرین لاگین</th>
                  <th className="px-4 py-3 text-right font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--amline-border)] dark:divide-slate-600">
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--amline-fg-subtle)]">
                      کاربری یافت نشد
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--amline-surface-muted)]/80 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 font-medium text-[var(--amline-fg)]">
                      {u.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--amline-fg-muted)]">{u.mobile}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[var(--amline-primary-muted)] px-2 py-0.5 text-xs font-medium text-[var(--amline-primary)] dark:text-blue-300">
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--amline-fg-muted)]">
                      {u.last_login
                        ? new Date(u.last_login).toLocaleDateString('fa-IR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/users/${u.id}`)}
                        className="rounded px-3 py-1 text-xs font-medium text-[var(--amline-primary)] hover:bg-[var(--amline-primary-muted)] dark:hover:bg-blue-950/50"
                      >
                        مشاهده
                      </button>
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
                className="rounded px-3 py-1 text-sm text-[var(--amline-fg)] disabled:opacity-40"
              >
                قبلی
              </button>
              <span className="text-sm text-[var(--amline-fg-muted)]">
                صفحه {page} از {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded px-3 py-1 text-sm text-[var(--amline-fg)] disabled:opacity-40"
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
