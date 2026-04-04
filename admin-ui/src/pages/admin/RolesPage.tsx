import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiClient } from '../../lib/api'
import { apiV1 } from '../../lib/apiPaths'
import { useAuth } from '../../hooks/useAuth'

export interface AdminRole {
  id: string
  name: string
  description?: string
  permissions: string[]
}

export default function RolesPage() {
  const { hasPermission } = useAuth()
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [permText, setPermText] = useState('')

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await apiClient.get<AdminRole[]>(apiV1('admin/roles'))
      return res.data
    },
  })

  const patchMutation = useMutation({
    mutationFn: async ({ id, permissions }: { id: string; permissions: string[] }) => {
      const res = await apiClient.patch<AdminRole>(apiV1(`admin/roles/${id}`), { permissions })
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-roles'] })
      setEditingId(null)
    },
  })

  const startEdit = (r: AdminRole) => {
    setEditingId(r.id)
    setPermText(r.permissions.join(', '))
  }

  const saveEdit = () => {
    if (!editingId) return
    const permissions = permText
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    patchMutation.mutate({ id: editingId, permissions })
  }

  return (
    <div dir="rtl" className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">نقش‌ها و مجوزها</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          لیست نقش‌های تعریف‌شده (mock). ویرایش مجوزها با PATCH به سرور توسعه.
        </p>
      </div>

      {isLoading ? (
        <p className="text-gray-500">در حال بارگذاری…</p>
      ) : (
        <div className="space-y-4">
          {roles.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">{r.name}</h2>
                  {r.description ? (
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{r.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">شناسه: {r.id}</p>
                </div>
                {hasPermission('roles:write') && (
                  <button
                    type="button"
                    onClick={() => (editingId === r.id ? setEditingId(null) : startEdit(r))}
                    className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
                  >
                    {editingId === r.id ? 'انصراف' : 'ویرایش مجوزها'}
                  </button>
                )}
              </div>

              {editingId === r.id ? (
                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    مجوزها (جدا با ویرگول یا خط جدید)
                  </label>
                  <textarea
                    value={permText}
                    onChange={(e) => setPermText(e.target.value)}
                    rows={6}
                    className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={patchMutation.isPending}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    ذخیره
                  </button>
                </div>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-1">
                  {r.permissions.map((p) => (
                    <li
                      key={p}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
