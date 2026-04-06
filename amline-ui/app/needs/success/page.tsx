'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { hasAccessToken } from '../../../lib/auth'
import { QUEUE_MESSAGE } from '../../../lib/needsConstants'

function SuccessInner() {
  const search = useSearchParams()
  const kind = search.get('kind') ?? ''
  const [msg, setMsg] = useState(QUEUE_MESSAGE)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('needs:lastSubmit')
      if (raw) {
        const j = JSON.parse(raw) as { queueMessage?: string }
        if (j.queueMessage) setMsg(j.queueMessage)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const kindLabel =
    kind === 'buy' ? 'خرید' : kind === 'rent' ? 'رهن و اجاره' : kind === 'barter' ? 'معاوضه' : 'نیازمندی'

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-10 text-center">
      <div className="rounded-full bg-[var(--amline-primary-muted)] p-6 text-4xl" aria-hidden>
        ⏳
      </div>
      <h1 className="amline-display mt-6 text-[var(--amline-fg)]">در صف انتشار</h1>
      <p className="amline-body mt-3 max-w-sm text-[var(--amline-fg-muted)]">{msg}</p>
      <p className="amline-caption mt-2 text-[var(--amline-fg-subtle)]">نوع: {kindLabel}</p>
      <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
        <Link href="/browse" className="btn btn-primary min-h-[48px] font-semibold">
          بازگشت به بازار
        </Link>
        <Link href="/needs" className="btn btn-outline min-h-[48px] font-semibold dark:border-slate-700">
          ثبت نیازمندی دیگر
        </Link>
        <Link href="/contracts" className="text-sm text-[var(--amline-primary)]">
          قراردادهای من
        </Link>
      </div>
    </main>
  )
}

export default function NeedSuccessPage() {
  const router = useRouter()

  useEffect(() => {
    if (!hasAccessToken()) router.replace('/login')
  }, [router])

  if (!hasAccessToken()) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <p className="amline-body text-center">در حال هدایت به ورود…</p>
      </main>
    )
  }

  return (
    <Suspense fallback={<p className="py-16 text-center text-[var(--amline-fg-muted)]">…</p>}>
      <SuccessInner />
    </Suspense>
  )
}
