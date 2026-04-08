'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useAuthReady } from '../../../lib/useAuthReady'
import { getRequirement } from '../../../lib/needsApi'
import { QUEUE_MESSAGE } from '../../../lib/needsConstants'

function SuccessInner() {
  const search = useSearchParams()
  const kind = search.get('kind') ?? ''
  const id = search.get('id') ?? ''
  const [msg, setMsg] = useState(QUEUE_MESSAGE)
  const [titleHint, setTitleHint] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await getRequirement(id)
        if (cancelled) return
        if (r.queue_message) setMsg(r.queue_message)
        if (r.publish_title) setTitleHint(r.publish_title)
      } catch {
        /* keep fallback QUEUE_MESSAGE */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

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
      {titleHint ? (
        <p className="amline-caption mt-1 max-w-sm text-[var(--amline-fg-muted)]">{titleHint}</p>
      ) : null}
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
    <Suspense fallback={<p className="py-16 text-center text-[var(--amline-fg-muted)]">…</p>}>
      <SuccessInner />
    </Suspense>
  )
}
