import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { apiClient } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { APP_NAV_ITEMS } from '../../config/navigation'
import { featureEnabled } from '../../lib/featureFlags'
import { TableSkeleton } from '../../components/patterns/TableSkeleton'

export interface AdminRole {
  id: string
  name: string
  description?: string
  permissions: string[]
}

function menuPreviewForPermissions(perms: string[]) {
  return APP_NAV_ITEMS.filter(
    (item) =>
      (!item.featureFlag || featureEnabled(item.featureFlag)) &&
      (!item.permission || perms.includes(item.permission))
  ).map((item) => item.label)
}

function parsePerms(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function RolesPage() {
  const { hasPermission } = useAuth()
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editPerms, setEditPerms] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPerms, setNewPerms] = useState('users:read')

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await apiClient.get<AdminRole[]>('/admin/roles')
      return res.data
    },
  })

  const patchMutation = useMutation({
    mutationFn: async (payload: {
      id: string
      name?: string
      description?: string
      permissions?: string[]
    }) => {
      const { id, ...body } = payload
      const res = await apiClient.patch<AdminRole>(`/admin/roles/${id}`, body)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-roles'] })
      setEditingId(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (body: { name: string; description?: string; permissions: string[] }) => {
      const res = await apiClient.post<AdminRole>('/admin/roles', body)
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-roles'] })
      setNewName('')
      setNewDesc('')
      setNewPerms('users:read')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/admin/roles/${id}`)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-roles'] }),
  })

  const startEdit = (r: AdminRole) => {
    setEditingId(r.id)
    setEditName(r.name)
    setEditDesc(r.description ?? '')
    setEditPerms(r.permissions.join(', '))
  }

  const saveEdit = () => {
    if (!editingId) return
    patchMutation.mutate({
      id: editingId,
      name: editName.trim(),
      description: editDesc.trim(),
      permissions: parsePerms(editPerms),
    })
  }

  const submitNew = () => {
    const name = newName.trim()
    if (!name) return
    createMutation.mutate({
      name,
      description: newDesc.trim() || undefined,
      permissions: parsePerms(newPerms),
    })
  }

  return (
    <div dir="rtl" className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">نقش‌ها و مجوزها</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          ایجاد، ویرایش نام/توضیح/مجوز، حذف (به‌جز نقش سیستمی). با API و MSW هماهنگ.
        </p>
      </div>

      {hasPermission('roles:write') ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 dark:border-slate-600 dark:bg-slate-900/40">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-200">نقش جدید</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-slate-400">نام</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                placeholder="مثلاً کارشناس فروش"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600 dark:text-slate-400">توضیح</span>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
              />
            </label>
          </div>
          <label className="mt-3 block text-sm">
            <span className="text-gray-600 dark:text-slate-400">مجوزها (ویرگول یا خط جدید)</span>
            <textarea
              value={newPerms}
              onChange={(e) => setNewPerms(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
            />
          </label>
          <button
            type="button"
            disabled={createMutation.isPending || !newName.trim()}
            onClick={submitNew}
            className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            ایجاد نقش
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <TableSkeleton rows={4} columns={1} />
      ) : (
        <div className="space-y-4">
          {roles.map((r) => (
            <RoleCard
              key={r.id}
              role={r}
              editingId={editingId}
              editName={editName}
              editDesc={editDesc}
              editPerms={editPerms}
              setEditName={setEditName}
              setEditDesc={setEditDesc}
              setEditPerms={setEditPerms}
              hasPermission={hasPermission}
              patchMutation={patchMutation}
              deleteMutation={deleteMutation}
              startEdit={startEdit}
              setEditingId={setEditingId}
              saveEdit={saveEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RoleCard({
  role: r,
  editingId,
  editName,
  editDesc,
  editPerms,
  setEditName,
  setEditDesc,
  setEditPerms,
  hasPermission,
  patchMutation,
  deleteMutation,
  startEdit,
  setEditingId,
  saveEdit,
}: {
  role: AdminRole
  editingId: string | null
  editName: string
  editDesc: string
  editPerms: string
  setEditName: (s: string) => void
  setEditDesc: (s: string) => void
  setEditPerms: (s: string) => void
  hasPermission: (p: string) => boolean
  patchMutation: {
    isPending: boolean
    mutate: (a: {
      id: string
      name?: string
      description?: string
      permissions?: string[]
    }) => void
  }
  deleteMutation: { isPending: boolean; mutate: (id: string) => void }
  startEdit: (r: AdminRole) => void
  setEditingId: (id: string | null) => void
  saveEdit: () => void
}) {
  const previewLabels = useMemo(() => menuPreviewForPermissions(r.permissions), [r.permissions])
  const isEditing = editingId === r.id
  const isSystem = r.id === 'role-admin'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">{r.name}</h2>
          {r.description ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{r.description}</p>
          ) : null}
          <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">شناسه: {r.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('roles:write') ? (
            <button
              type="button"
              onClick={() => (isEditing ? setEditingId(null) : startEdit(r))}
              className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
            >
              {isEditing ? 'انصراف' : 'ویرایش'}
            </button>
          ) : null}
          {hasPermission('roles:write') && !isSystem ? (
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm(`حذف نقش «${r.name}»؟`)) deleteMutation.mutate(r.id)
              }}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-50"
            >
              حذف
            </button>
          ) : null}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            نام
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            توضیح
            <input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            مجوزها (ویرگول یا خط جدید)
            <textarea
              value={editPerms}
              onChange={(e) => setEditPerms(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
          <button
            type="button"
            onClick={saveEdit}
            disabled={patchMutation.isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            ذخیره تغییرات
          </button>
        </div>
      ) : (
        <>
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
          <div className="mt-3 rounded-lg border border-dashed border-gray-200 bg-gray-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="text-xs font-medium text-gray-600 dark:text-slate-400">
              پیش‌نمایش منوی سایدبار (بر اساس مجوزها)
            </p>
            <p className="mt-1 text-sm text-gray-800 dark:text-slate-200">
              {previewLabels.length ? previewLabels.join('، ') : '—'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
