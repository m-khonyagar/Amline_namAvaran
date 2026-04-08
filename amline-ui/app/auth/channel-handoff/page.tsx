'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function ChannelHandoffInner() {
  const sp = useSearchParams()
  const token = sp.get('token')
  const target = sp.get('next') ?? '/contracts'

  return (
    <div
      dir="rtl"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-5 p-6"
    >
      <h1 className="amline-display text-[var(--amline-fg)]">ورود از کانال اَملاین</h1>
      <p className="amline-body">
        اگر از ربات بله، ایتا یا تلگرام به اینجا هدایت شده‌اید، سرور باید توکن{' '}
        <code className="rounded-[var(--amline-radius-sm)] bg-[var(--amline-surface-muted)] px-1.5 py-0.5 font-mono text-xs text-[var(--amline-fg)]">
          {token ? '…' + token.slice(-6) : '—'}
        </code>{' '}
        را تأیید و نشست وب را بسازد.
      </p>
      {!token ? (
        <p className="rounded-amline border border-amber-200 bg-[var(--amline-warning-muted)] px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:text-amber-100">
          توکن در آدرس نیست — لینک ربات را دوباره باز کنید.
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          href={target}
          className="btn btn-primary min-h-[48px] flex-1 justify-center px-5 font-semibold sm:flex-none"
        >
          ادامه به داشبورد
        </Link>
        <Link href="/login" className="btn btn-outline min-h-[48px] flex-1 justify-center sm:flex-none">
          ورود معمولی
        </Link>
      </div>
    </div>
  )
}

export default function ChannelHandoffPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center p-8">
          <p className="amline-body">در حال بارگذاری…</p>
        </div>
      }
    >
      <ChannelHandoffInner />
    </Suspense>
  )
}
