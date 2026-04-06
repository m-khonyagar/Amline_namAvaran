'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { BROWSE_MOCK, type BrowseItem } from '../../lib/browseMock'
import { CITY_OPTIONS } from '../../lib/needsConstants'
import { hasAccessToken } from '../../lib/auth'

type Tab = 'barter' | 'buy' | 'rent'

function matchesFilters(item: BrowseItem, tab: Tab, city: string, q: string): boolean {
  if (item.kind !== tab) return false
  if (city && item.city !== city) return false
  if (q) {
    const s = `${item.title} ${item.excerpt} ${item.neighborhood}`.toLowerCase()
    if (!s.includes(q.toLowerCase())) return false
  }
  return true
}

export default function BrowsePage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('buy')
  const [filterOpen, setFilterOpen] = useState(false)
  const [cityFilter, setCityFilter] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!hasAccessToken()) router.replace('/login')
  }, [router])

  const cityNames = useMemo(() => CITY_OPTIONS.map((c) => c.label), [])

  const rows = useMemo(
    () => BROWSE_MOCK.filter((item) => matchesFilters(item, tab, cityFilter, query)),
    [tab, cityFilter, query]
  )

  if (!hasAccessToken()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="amline-body text-center">در حال هدایت به ورود…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-4 sm:px-6 sm:pt-6">
      <header className="flex items-center gap-3 border-b border-[var(--amline-border)] pb-4">
        <Link
          href="/"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)]"
          aria-label="بازگشت"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="amline-display flex-1 text-center text-[var(--amline-fg)]">نیازمندی‌ها و آگهی‌ها</h1>
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          className="flex h-11 min-w-[4.5rem] shrink-0 items-center justify-center rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] text-xs font-medium text-[var(--amline-fg)]"
        >
          فیلترها
        </button>
      </header>

      {filterOpen ? (
        <div className="mt-4 space-y-3 rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/50 p-4 dark:border-slate-700">
          <div>
            <label className="amline-caption text-[var(--amline-fg-muted)]">شهر</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="input mt-1"
            >
              <option value="">همه شهرها</option>
              {cityNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="amline-caption text-[var(--amline-fg-muted)]">جستجو</label>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="عنوان یا محله…"
              className="input mt-1"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(
          [
            ['barter', 'معاوضه'],
            ['buy', 'خرید'],
            ['rent', 'رهن و اجاره'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`min-h-[44px] shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? 'border-[var(--amline-primary)] bg-[var(--amline-primary-muted)] text-[var(--amline-primary)]'
                : 'border-[var(--amline-border)] bg-[var(--amline-surface)] text-[var(--amline-fg-muted)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <li className="rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] p-6 text-center text-sm text-[var(--amline-fg-muted)] dark:border-slate-700">
            موردی با این فیلتر نیست. فیلتر را بازنشانی کنید یا بعداً دوباره مراجعه کنید.
          </li>
        ) : (
          rows.map((item) => (
            <li key={item.id}>
              <article className="card border border-[var(--amline-border)] p-4 shadow-[var(--amline-shadow-sm)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]">
                <h2 className="text-base font-semibold text-[var(--amline-fg)]">{item.title}</h2>
                <p className="amline-caption mt-1 text-[var(--amline-fg-subtle)]">
                  {item.city} — {item.neighborhood}
                </p>
                <p className="mt-2 text-sm text-[var(--amline-fg-muted)]">{item.excerpt}</p>
                <p className="mt-3 text-sm font-medium text-[var(--amline-primary)]">{item.priceLabel}</p>
                <div className="mt-4 flex gap-2 border-t border-[var(--amline-border)] pt-3 dark:border-slate-700">
                  <span className="text-xs text-[var(--amline-fg-subtle)]">نیازمندی‌های مشابه و آگهی‌های مشابه پس از اتصال به بک‌اند اینجا نمایش داده می‌شود.</span>
                </div>
              </article>
            </li>
          ))
        )}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--amline-border)] bg-[var(--amline-surface)]/95 backdrop-blur-sm dark:border-slate-700">
        <div
          className="mx-auto flex max-w-lg gap-2 px-4 pt-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <Link
            href="/needs"
            className="btn btn-primary flex min-h-[48px] flex-1 items-center justify-center font-semibold"
          >
            ثبت نیازمندی
          </Link>
        </div>
      </div>
    </main>
  )
}
