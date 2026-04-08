import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { APP_NAV_ITEMS } from '../config/navigation'
import { featureEnabled } from '../lib/featureFlags'
import { cn } from '../lib/cn'

const STORAGE_RECENT = 'amline-admin-nav-recent'
const MAX_RECENT = 6

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_RECENT)
    if (!raw) return []
    const arr = JSON.parse(raw) as string[]
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function pushRecent(to: string) {
  const prev = readRecent().filter((x) => x !== to)
  prev.unshift(to)
  try {
    localStorage.setItem(STORAGE_RECENT, JSON.stringify(prev.slice(0, MAX_RECENT)))
  } catch {
    /* ignore */
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const { hasPermission } = useAuth()

  const items = useMemo(() => {
    return APP_NAV_ITEMS.filter(
      (n) =>
        (!n.featureFlag || featureEnabled(n.featureFlag)) && (!n.permission || hasPermission(n.permission))
    )
  }, [hasPermission])

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return items
    return items.filter((i) => i.label.toLowerCase().includes(t) || i.to.toLowerCase().includes(t))
  }, [items, q])

  const recentPaths = useMemo(() => readRecent(), [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        setQ('')
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal aria-label="جستجوی سریع">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="بستن" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-[var(--amline-border)] bg-[var(--amline-surface)] shadow-2xl dark:border-slate-600">
        <div className="border-b border-[var(--amline-border)] px-3 py-2 dark:border-slate-700">
          <input
            autoFocus
            dir="rtl"
            aria-label="جستجو در منو و مسیرها"
            className="w-full bg-transparent px-2 py-2 text-sm outline-none"
            placeholder="جستجو در منو… (Ctrl+K)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <ul className="max-h-72 overflow-y-auto py-1 text-sm">
          {!q &&
            recentPaths.map((path) => {
              const meta = items.find((i) => i.to === path)
              if (!meta) return null
              return (
                <li key={`r-${path}`}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2 text-right hover:bg-[var(--amline-surface-muted)]"
                    onClick={() => {
                      pushRecent(path)
                      navigate(path)
                      setOpen(false)
                    }}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}</span>
                    <span className="mr-auto text-xs text-[var(--amline-fg-muted)]">اخیر</span>
                  </button>
                </li>
              )
            })}
          {filtered.map((i) => (
            <li key={i.to}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2 text-right hover:bg-[var(--amline-surface-muted)]'
                )}
                onClick={() => {
                  pushRecent(i.to)
                  navigate(i.to)
                  setOpen(false)
                }}
              >
                <span aria-hidden>{i.icon}</span>
                <span>{i.label}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? <li className="px-4 py-6 text-center text-[var(--amline-fg-muted)]">موردی نیست</li> : null}
        </ul>
      </div>
    </div>
  )
}
