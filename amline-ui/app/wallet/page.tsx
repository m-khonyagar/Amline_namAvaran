'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { hasAccessToken } from '../../lib/auth'
import { ensureMappedError } from '../../lib/errorMapper'
import { fetchJson } from '../../lib/fetchJson'

interface WalletSummary {
  id: string
  credit: number
  status: string
  user_id: string
}

export default function WalletPage() {
  const router = useRouter()
  const [data, setData] = useState<WalletSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasAccessToken()) {
      router.replace('/login')
      return
    }
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const json = await fetchJson<WalletSummary>('/financials/wallets')
        if (mounted) setData(json)
      } catch (e) {
        if (mounted) setError(ensureMappedError(e).message)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [router])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/contracts"
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-[var(--amline-primary)] transition hover:opacity-90"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
          <path
            d="M9 18l6-6-6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        بازگشت به قراردادها
      </Link>
      <h1 className="amline-display mt-4 text-[var(--amline-fg)]">کیف پول و پرداخت</h1>
      <p className="amline-body mt-2 text-sm text-[var(--amline-fg-muted)]">
        از اینجا موجودی کیف پول را می‌بینید؛ جزئیات تراکنش‌ها به‌زودی به همین بخش اضافه می‌شود.
      </p>

      {loading && <p className="amline-body mt-6">در حال بارگذاری…</p>}
      {error && (
        <p className="mt-6 rounded-amline border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-50">
          {error}
        </p>
      )}

      {data && !loading && (
        <div className="card mt-6 space-y-2 p-5 shadow-amline dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]">
          <p className="amline-caption">موجودی (تومان)</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--amline-fg)]">
            {data.credit.toLocaleString('fa-IR')}
          </p>
          <p className="amline-caption text-[var(--amline-fg-subtle)]">شناسه کیف: {data.id}</p>
        </div>
      )}
    </main>
  )
}
