'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ensureMappedError } from '../../lib/errorMapper'
import { devLogin, isDevBypassEnabled, loginWithOtp, sendOtp } from '../../lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile')
  const [loading, setLoading] = useState(false)
  const devBypass = isDevBypassEnabled()

  async function onSendOtp(e: FormEvent) {
    e.preventDefault()
    if (!mobile || mobile.length !== 11) {
      toast.error('لطفاً شماره موبایل ۱۱ رقمی معتبر وارد کنید (مثلاً 09121234567).')
      return
    }
    try {
      setLoading(true)
      await sendOtp(mobile)
      setStep('otp')
      toast.success('کد تأیید ارسال شد.')
    } catch (error: unknown) {
      const m = ensureMappedError(error)
      toast.error(m.message)
    } finally {
      setLoading(false)
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault()
    if (!otp || otp.length < 4 || otp.length > 6) {
      toast.error('کد تأیید باید بین ۴ تا ۶ رقم باشد.')
      return
    }
    try {
      setLoading(true)
      await loginWithOtp(mobile, otp)
      toast.success('ورود با موفقیت انجام شد.')
      router.replace('/contracts')
    } catch (error: unknown) {
      const m = ensureMappedError(error)
      toast.error(m.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8 sm:px-6 sm:py-12">
      <div className="rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] p-5 shadow-amline dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]">
        <h1 className="amline-display text-[var(--amline-primary)]">ورود به اَملاین</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--amline-fg-muted)]">
          برای مدیریت قراردادها ابتدا با شماره موبایل وارد شوید.
        </p>

        {step === 'mobile' ? (
          <form onSubmit={onSendOtp} className="mt-6 space-y-4" noValidate>
            <label className="block text-sm font-medium text-[var(--amline-fg)]" htmlFor="mobile">
              شماره موبایل
            </label>
            <input
              id="mobile"
              type="tel"
              inputMode="numeric"
              dir="ltr"
              className="w-full rounded-amline border border-[var(--amline-border)] bg-transparent px-3 py-2 text-sm outline-none ring-0 transition focus:border-[var(--amline-primary)] dark:border-slate-700"
              placeholder="0912xxxxxxx"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-amline bg-[var(--amline-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
            </button>
          </form>
        ) : (
          <form onSubmit={onLogin} className="mt-6 space-y-4" noValidate>
            <label className="block text-sm font-medium text-[var(--amline-fg)]" htmlFor="otp">
              کد تأیید
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              dir="ltr"
              className="w-full rounded-amline border border-[var(--amline-border)] bg-transparent px-3 py-2 text-sm outline-none ring-0 transition focus:border-[var(--amline-primary)] dark:border-slate-700"
              placeholder="کد ۴ تا ۶ رقمی"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-amline bg-[var(--amline-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'در حال ورود...' : 'ورود'}
            </button>
          </form>
        )}

        {devBypass ? (
          <button
            type="button"
            onClick={() => {
              devLogin()
              toast.success('ورود آزمایشی انجام شد.')
              router.replace('/contracts')
            }}
            className="mt-3 w-full rounded-amline border border-[var(--amline-border)] px-4 py-2 text-sm font-medium text-[var(--amline-fg-muted)] transition hover:bg-[var(--amline-surface-muted)] dark:border-slate-700"
          >
            ورود آزمایشی توسعه
          </button>
        ) : null}

        <div className="mt-5 text-xs text-[var(--amline-fg-subtle)]">
          <Link href="/" className="text-[var(--amline-primary)] hover:underline">
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </main>
  )
}
