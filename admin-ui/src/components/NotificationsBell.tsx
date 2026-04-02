import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { apiClient } from '../lib/api'
import { cn } from '../lib/cn'

export type AdminNotificationItem = {
  id: string
  title: string
  body?: string
  read: boolean
  created_at?: string
}

export function NotificationsBell() {
  const { hasPermission } = useAuth()
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const canRead = hasPermission('notifications:read')

  const { data } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const res = await apiClient.get<{ items: AdminNotificationItem[]; total?: number }>('/admin/notifications')
      return res.data
    },
    enabled: canRead,
  })

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/admin/notifications/${id}`, { read: true })
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  })

  if (!canRead) return null
  const items = data?.items ?? []
  const unread = items.filter((i) => !i.read).length

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-amline-md border border-[var(--amline-border)] text-lg hover:bg-[var(--amline-surface-muted)] dark:border-slate-600"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="اعلان‌ها"
      >
        🔔
        {unread > 0 ? (
          <span className="absolute -left-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="بستن اعلان‌ها"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="فهرست اعلان‌ها"
            className="absolute left-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface)] p-2 shadow-amline dark:border-slate-700"
          >
            {items.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-[var(--amline-fg-muted)]">اعلانی نیست</p>
            ) : (
              <ul className="max-h-72 space-y-1 overflow-y-auto">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-right text-sm transition-colors',
                        n.read
                          ? 'text-[var(--amline-fg-muted)]'
                          : 'bg-[var(--amline-primary-muted)] font-medium text-[var(--amline-fg)]'
                      )}
                      onClick={() => {
                        if (!n.read) markOne.mutate(n.id)
                      }}
                    >
                      <span className="font-medium">{n.title}</span>
                      {n.body ? <span className="mt-0.5 block text-xs opacity-90">{n.body}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 border-t border-[var(--amline-border)] pt-2 dark:border-slate-700">
              <Link
                to="/admin/inbox"
                className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-[var(--amline-primary)] hover:bg-[var(--amline-surface-muted)]"
                onClick={() => setOpen(false)}
              >
                صندوق ورودی کامل
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
