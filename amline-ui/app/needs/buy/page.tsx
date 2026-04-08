'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BuyRentNeedForm } from '../../../components/needs/BuyRentNeedForm'
import { useAuthReady } from '../../../lib/useAuthReady'

export default function NeedBuyPage() {
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
    <main className="mx-auto max-w-lg px-4 pb-32 pt-6 sm:px-6">
      <header className="mb-6 flex items-center gap-3 border-b border-[var(--amline-border)] pb-4">
        <Link
          href="/needs"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)]"
          aria-label="بازگشت"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="amline-title flex-1 text-center text-base text-[var(--amline-fg)]">ثبت نیازمندی — خرید</h1>
        <span className="w-11" aria-hidden />
      </header>

      <BuyRentNeedForm mode="buy" />
    </main>
  )
}
