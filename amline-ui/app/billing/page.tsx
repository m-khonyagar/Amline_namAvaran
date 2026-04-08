'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchJson } from '../../lib/fetchJson'

type Plan = { id: string; code: string; name_fa: string; price_cents: number; cycle: string }
type Sub = { id: string; status: string; current_period_end?: string | null }
type Invoice = {
  lines: { description: string; amount_cents: number }[]
  total_cents: number
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [sub, setSub] = useState<Sub | null | undefined>(undefined)
  const [inv, setInv] = useState<Invoice | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const p = await fetchJson<Plan[]>('/api/v1/billing/plans')
        if (!cancelled) setPlans(p)
        const s = await fetchJson<Sub | null>('/api/v1/billing/me')
        if (!cancelled) setSub(s)
        if (s) {
          const i = await fetchJson<Invoice | null>('/api/v1/billing/invoice/latest')
          if (!cancelled) setInv(i)
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'خطا')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function pickPlan(code: string) {
    setErr(null)
    try {
      await fetchJson('/api/v1/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_code: code }),
      })
      const s = await fetchJson<Sub | null>('/api/v1/billing/me')
      setSub(s)
      if (s) {
        const i = await fetchJson<Invoice | null>('/api/v1/billing/invoice/latest')
        setInv(i)
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا')
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/" className="text-sm text-[var(--amline-primary)] hover:underline">
        ← بازگشت
      </Link>
      <h1 className="amline-display mt-4 text-[var(--amline-fg)]">اشتراک</h1>
      {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}

      <section className="mt-6 space-y-2 rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--amline-fg)]">وضعیت</h2>
        {sub === undefined && <p className="text-sm text-[var(--amline-fg-muted)]">در حال بارگذاری…</p>}
        {sub === null && <p className="text-sm text-[var(--amline-fg-muted)]">اشتراک فعال نیست.</p>}
        {sub ? (
          <p className="text-sm text-[var(--amline-fg)]">
            {sub.status}
            {sub.current_period_end ? ` — پایان دوره: ${sub.current_period_end}` : ''}
          </p>
        ) : null}
      </section>

      {inv && inv.lines.length > 0 ? (
        <section className="mt-4 space-y-2 rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--amline-fg)]">فاکتور</h2>
          <ul className="text-sm text-[var(--amline-fg-muted)]">
            {inv.lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-[var(--amline-border)] py-1">
                <span>{l.description}</span>
                <span dir="ltr">{l.amount_cents.toLocaleString('fa-IR')}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm font-medium text-[var(--amline-fg)]">
            جمع: <span dir="ltr">{inv.total_cents.toLocaleString('fa-IR')}</span> ریال
          </p>
        </section>
      ) : null}

      <section className="mt-4 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--amline-fg)]">پلن‌ها</h2>
        {!plans && <p className="text-sm text-[var(--amline-fg-muted)]">…</p>}
        {(plans ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => void pickPlan(p.code)}
            className="flex w-full min-h-[52px] flex-col items-start rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-3 text-right text-[var(--amline-fg)] shadow-[var(--amline-shadow-sm)] transition-colors hover:bg-[var(--amline-surface-muted)]"
          >
            <span className="font-medium">{p.name_fa}</span>
            <span className="text-xs text-[var(--amline-fg-muted)]">
              {p.price_cents.toLocaleString('fa-IR')} ریال / {p.cycle}
            </span>
          </button>
        ))}
      </section>
    </main>
  )
}
