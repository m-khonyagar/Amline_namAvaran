'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuthReady } from '../../lib/useAuthReady'

export default function NeedsHubPage() {
  const router = useRouter()
  const authReady = useAuthReady()

  useEffect(() => {
    if (authReady === false) router.replace('/login')
  }, [authReady, router])

  if (authReady === null) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="amline-body text-center text-[var(--amline-fg-muted)]">در حال بارگذاری…</p>
      </main>
    )
  }

  if (!authReady) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="amline-body text-center">در حال هدایت به ورود…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-10 pt-6 sm:px-6">
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-[var(--amline-primary)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        خانه
      </Link>

      <h1 className="amline-display mt-4 text-center text-[var(--amline-fg)]">ثبت نیازمندی</h1>
      <p className="amline-body mt-2 text-center text-[var(--amline-fg-muted)]">گزینه مورد نظر خود را انتخاب کنید</p>

      <div className="mx-auto mt-10 flex max-w-sm justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--amline-primary-muted)] text-4xl" aria-hidden>
          🏠
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-[var(--amline-fg-subtle)]">
        <Link href="/browse" className="font-medium text-[var(--amline-primary)]">
          بازار نیازمندی‌ها و آگهی‌ها
        </Link>
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Link
          href="/needs/barter"
          className="card flex min-h-[120px] flex-col items-center justify-end gap-2 border-2 border-transparent px-2 py-4 text-center shadow-[var(--amline-shadow-sm)] transition-colors hover:border-[var(--amline-primary)]/30 dark:border-slate-700"
        >
          <span className="text-2xl" aria-hidden>
            ⇄
          </span>
          <span className="text-sm font-semibold text-[var(--amline-fg)]">معاوضه</span>
        </Link>
        <Link
          href="/needs/buy"
          className="card flex min-h-[120px] flex-col items-center justify-end gap-2 border-2 border-transparent px-2 py-4 text-center shadow-[var(--amline-shadow-sm)] transition-colors hover:border-[var(--amline-primary)]/30 dark:border-slate-700"
        >
          <span className="text-2xl" aria-hidden>
            🛒
          </span>
          <span className="text-sm font-semibold text-[var(--amline-fg)]">خرید</span>
        </Link>
        <Link
          href="/needs/rent"
          className="card flex min-h-[120px] flex-col items-center justify-end gap-2 border-2 border-transparent px-2 py-4 text-center shadow-[var(--amline-shadow-sm)] transition-colors hover:border-[var(--amline-primary)]/30 dark:border-slate-700"
        >
          <span className="text-2xl" aria-hidden>
            🔑
          </span>
          <span className="text-sm font-semibold text-[var(--amline-fg)]">رهن و اجاره</span>
        </Link>
      </div>

    </main>
  )
}
