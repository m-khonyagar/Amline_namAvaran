'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

/**
 * نقطهٔ ورود پس از ربات (تلگرام / بله / ایتا): بک‌اند توکن یک‌بار مصرف را با session وب مبادله می‌کند.
 * این صفحه فقط قرارداد URL و UX را نشان می‌دهد؛ منطق واقعی روی API است.
 */
function ChannelHandoffInner() {
  const sp = useSearchParams()
  const token = sp.get('token')
  const target = sp.get('next') ?? '/contracts'

  return (
    <div dir="rtl" className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-xl font-bold text-slate-900">ورود از کانال املاین</h1>
      <p className="text-sm text-slate-600">
        اگر از ربات بله، ایتا یا تلگرام به اینجا هدایت شده‌اید، سرور باید توکن{' '}
        <code className="rounded bg-slate-100 px-1 text-xs">{token ? '…' + token.slice(-6) : '—'}</code>{' '}
        را تأیید و نشست وب را بسازد.
      </p>
      {!token ? (
        <p className="text-amber-700 text-sm">توکن در آدرس نیست — لینک ربات را دوباره باز کنید.</p>
      ) : null}
      <div className="flex gap-3">
        <Link
          href={target}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          ادامه به داشبورد (پس از اتصال API)
        </Link>
        <Link href="/login" className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
          ورود معمولی
        </Link>
      </div>
    </div>
  )
}

export default function ChannelHandoffPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">…</div>}>
      <ChannelHandoffInner />
    </Suspense>
  )
}
