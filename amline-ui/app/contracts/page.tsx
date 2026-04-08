'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { hasAccessToken } from '../../lib/auth'
import { ensureMappedError } from '../../lib/errorMapper'
import { fetchJson } from '../../lib/fetchJson'
import {
  badgeTone,
  contractMatchesQuery,
  contractTabCategory,
  contractCardTitle,
  contractRoleLine,
  listCardBadgeLabel,
  listCardHint,
  type MyContractRow,
  type MyContractsTab,
  showDeleteDraft,
  showDownloadContract,
} from '../../lib/myContractsUi'

type ContractsApiResponse =
  | MyContractRow[]
  | { items: MyContractRow[]; total: number; page?: number; limit?: number }

function faCount(n: number): string {
  return n.toLocaleString('fa-IR')
}

const TAB_META: Record<MyContractsTab, { label: string }> = {
  active: { label: 'جاری' },
  draft: { label: 'پیش‌نویس' },
  closed: { label: 'خاتمه‌یافته' },
}

const BADGE_CLASS: Record<
  ReturnType<typeof badgeTone>,
  string
> = {
  neutral:
    'bg-[var(--amline-surface-muted)] text-[var(--amline-fg-muted)] border border-[var(--amline-border)]',
  warning: 'bg-[var(--amline-warning-muted)] text-[var(--amline-warning)] border border-amber-200/60',
  success: 'bg-[var(--amline-success-muted)] text-[var(--amline-success)] border border-teal-200/50',
  danger: 'bg-[var(--amline-error-muted)] text-[var(--amline-error)] border border-red-200/50',
  info: 'bg-[var(--amline-info-muted)] text-[var(--amline-info)] border border-sky-200/50',
}

export default function ContractsListPage() {
  const router = useRouter()
  const [items, setItems] = useState<MyContractRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string[]>([])
  const [errorHint, setErrorHint] = useState<string | null>(null)
  const [tab, setTab] = useState<MyContractsTab>('active')
  const [tabBootstrapped, setTabBootstrapped] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    const raw = await fetchJson<ContractsApiResponse>('/contracts/list', {
      headers: { 'Content-Type': 'application/json' },
    })
    const rows = Array.isArray(raw) ? raw : (raw as { items: MyContractRow[] }).items ?? []
    setItems(rows)
  }, [])

  useEffect(() => {
    if (!hasAccessToken()) {
      router.replace('/login')
      return
    }
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setErrorDetails([])
        setErrorHint(null)
        await loadList()
      } catch (e) {
        if (mounted) {
          const m = ensureMappedError(e)
          setError(m.message)
          setErrorDetails(m.detailLines)
          setErrorHint(m.hint ?? null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [router, loadList])

  const counts = useMemo(() => {
    let active = 0
    let draft = 0
    let closed = 0
    for (const c of items) {
      const cat = contractTabCategory(c)
      if (cat === 'active') active += 1
      else if (cat === 'draft') draft += 1
      else closed += 1
    }
    return { active, draft, closed }
  }, [items])

  useEffect(() => {
    if (loading || tabBootstrapped || items.length === 0) return
    if (counts.active > 0) setTab('active')
    else if (counts.draft > 0) setTab('draft')
    else setTab('closed')
    setTabBootstrapped(true)
  }, [loading, tabBootstrapped, items.length, counts.active, counts.draft])

  const filtered = useMemo(() => {
    return items.filter((c) => contractTabCategory(c) === tab && contractMatchesQuery(c, query))
  }, [items, tab, query])

  async function handleRevoke(id: string) {
    if (!window.confirm('پیش‌نویس حذف شود؟ این عمل قابل بازگشت نیست.')) return
    setDeletingId(id)
    setActionMsg(null)
    try {
      await fetchJson(`/contracts/${id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      await loadList()
    } catch (e) {
      const m = ensureMappedError(e)
      setActionMsg(m.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handlePdf(id: string) {
    setPdfLoadingId(id)
    setActionMsg(null)
    try {
      const r = await fetchJson<{ url: string | null; status: string }>(`/contracts/${id}/pdf`)
      if (r.url) {
        window.open(r.url, '_blank', 'noopener,noreferrer')
      } else {
        setActionMsg('فایل PDF هنوز آماده نیست؛ بعداً دوباره تلاش کنید.')
      }
    } catch (e) {
      const m = ensureMappedError(e)
      setActionMsg(m.message)
    } finally {
      setPdfLoadingId(null)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-4 sm:px-6 sm:pt-6">
      <header className="flex items-center gap-3 border-b border-[var(--amline-border)] pb-4">
        <Link
          href="/"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] text-[var(--amline-fg)] shadow-[var(--amline-shadow-sm)] transition-colors hover:bg-[var(--amline-surface-muted)]"
          aria-label="بازگشت"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 18l6-6-6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="amline-display flex-1 text-center text-[var(--amline-fg)]">قراردادهای من</h1>
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] text-[var(--amline-fg-muted)] shadow-[var(--amline-shadow-sm)] transition-colors hover:bg-[var(--amline-surface-muted)]"
          aria-expanded={searchOpen}
          aria-label="جستجو"
          onClick={() => setSearchOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {searchOpen && (
        <div className="mt-4">
          <label className="sr-only" htmlFor="contracts-search">
            جستجو در قراردادها
          </label>
          <input
            id="contracts-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو بر اساس عنوان، شناسه یا وضعیت…"
            className="w-full rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-3 text-sm text-[var(--amline-fg)] shadow-[var(--amline-shadow-sm)] outline-none ring-[var(--amline-ring)] placeholder:text-[var(--amline-fg-subtle)] focus:ring-2"
          />
        </div>
      )}

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(['active', 'draft', 'closed'] as const).map((key) => {
          const n = counts[key]
          const selected = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-[var(--amline-primary)] bg-[var(--amline-primary-muted)] text-[var(--amline-primary)]'
                  : 'border-[var(--amline-border)] bg-[var(--amline-surface)] text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)]'
              }`}
            >
              <span
                className={`flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                  selected ? 'bg-[var(--amline-primary)] text-white' : 'bg-[var(--amline-border)] text-[var(--amline-fg)]'
                }`}
              >
                {faCount(n)}
              </span>
              {TAB_META[key].label}
            </button>
          )
        })}
      </div>

      {actionMsg && (
        <p
          role="status"
          className="mt-4 rounded-amline border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {actionMsg}
        </p>
      )}

      {loading && (
        <div className="mt-8 rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] p-6 text-center text-sm text-[var(--amline-fg-muted)] shadow-[var(--amline-shadow-sm)]">
          در حال بارگذاری…
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-6 space-y-3 rounded-amline border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-amline dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-50"
        >
          <div>
            <p className="text-xs font-semibold text-red-800 dark:text-red-200">علت خطا</p>
            <p className="mt-1 whitespace-pre-wrap font-medium leading-relaxed">{error}</p>
          </div>
          {errorDetails.length > 0 && (
            <div className="rounded-amline-md border border-red-200/80 bg-white/70 p-3 dark:border-red-900/40 dark:bg-red-950/30">
              <p className="mb-2 text-xs font-semibold">جزئیات</p>
              <ul className="list-disc space-y-1 pr-5 text-xs leading-relaxed">
                {errorDetails.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          {errorHint ? (
            <div className="border-t border-red-200/80 pt-3 dark:border-red-900/40">
              <p className="text-xs font-semibold">اقدام پیشنهادی</p>
              <p className="mt-1 text-xs leading-relaxed opacity-95">{errorHint}</p>
            </div>
          ) : null}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-8 rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] p-8 text-center shadow-[var(--amline-shadow-sm)]">
          <p className="text-sm font-medium text-[var(--amline-fg)]">
            {items.length === 0
              ? 'هنوز قراردادی برای این حساب ثبت نشده است.'
              : query.trim()
                ? 'نتیجه‌ای با این جستجو پیدا نشد.'
                : `در این بخش قراردادی وجود ندارد.`}
          </p>
          {items.length === 0 && (
            <Link
              href="/contracts/wizard"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-amline bg-[var(--amline-primary)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--amline-primary-hover)]"
            >
              شروع قرارداد جدید
            </Link>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ul className="mt-6 space-y-4">
          {filtered.map((c) => {
            const tone = badgeTone(c)
            const dateStr = new Date(c.created_at).toLocaleDateString('fa-IR')
            return (
              <li
                key={c.id}
                className="overflow-hidden rounded-[var(--amline-radius-lg)] border border-[var(--amline-border)] bg-[var(--amline-surface)] shadow-[var(--amline-shadow-md)]"
              >
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${BADGE_CLASS[tone]}`}
                    >
                      {listCardBadgeLabel(c)}
                    </span>
                    <time
                      dateTime={c.created_at}
                      className="text-xs text-[var(--amline-fg-subtle)]"
                    >
                      {dateStr}
                    </time>
                  </div>
                  <h2 className="text-base font-bold leading-snug text-[var(--amline-fg)]">
                    {contractCardTitle(c)}
                  </h2>
                  <p className="text-sm text-[var(--amline-fg-muted)]">{contractRoleLine(c)}</p>
                  <div className="flex gap-2 rounded-amline-md bg-[var(--amline-surface-muted)]/80 px-3 py-2">
                    <span className="mt-0.5 shrink-0 text-[var(--amline-info)]" aria-hidden>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                        <path
                          d="M12 10v6M12 8h.01"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <p className="text-xs leading-relaxed text-[var(--amline-fg-muted)]">
                      {listCardHint(c)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <Link
                      href={`/contracts/${c.id}`}
                      className="flex min-h-[48px] w-full items-center justify-center rounded-amline bg-[var(--amline-primary)] text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--amline-primary-hover)]"
                    >
                      مشاهده قرارداد
                    </Link>
                    {showDeleteDraft(c) && (
                      <button
                        type="button"
                        disabled={deletingId === c.id}
                        onClick={() => handleRevoke(c.id)}
                        className="min-h-[44px] w-full rounded-amline border border-red-200 bg-white text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-950/30"
                      >
                        {deletingId === c.id ? 'در حال حذف…' : 'حذف پیش‌نویس'}
                      </button>
                    )}
                    {showDownloadContract(c) && (
                      <button
                        type="button"
                        disabled={pdfLoadingId === c.id}
                        onClick={() => handlePdf(c.id)}
                        className="min-h-[44px] w-full rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface-muted)] text-sm font-medium text-[var(--amline-primary)] transition-colors hover:bg-[var(--amline-primary-muted)] disabled:opacity-50"
                      >
                        {pdfLoadingId === c.id ? 'در حال آماده‌سازی…' : 'دانلود فایل قرارداد'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-[var(--amline-border)] bg-[var(--amline-surface)]/95 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-lg gap-3">
          <Link
            href="/contracts/wizard"
            className="flex min-h-[52px] flex-1 items-center justify-center rounded-amline bg-[var(--amline-primary)] text-sm font-semibold text-white shadow-amline transition-colors hover:bg-[var(--amline-primary-hover)]"
          >
            قرارداد جدید
          </Link>
          <Link
            href="/"
            className="flex min-h-[52px] items-center justify-center rounded-amline border border-[var(--amline-border)] px-4 text-sm font-medium text-[var(--amline-fg-muted)] transition-colors hover:bg-[var(--amline-surface-muted)]"
          >
            خانه
          </Link>
        </div>
      </div>
    </main>
  )
}
