'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ensureMappedError } from '../../lib/errorMapper'
import {
  DEV_FIXED_TEST_MOBILE,
  DEV_FIXED_TEST_OTP,
  devLogin,
  isDevBypassEnabled,
  loginWithOtp,
  sendOtp,
} from '../../lib/auth'

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

  async function onDevTrialSendOtp() {
    try {
      setLoading(true)
      setMobile(DEV_FIXED_TEST_MOBILE)
      await sendOtp(DEV_FIXED_TEST_MOBILE)
      setStep('otp')
      setOtp('')
      toast.success('کد برای شماره تست ارسال شد؛ در mock با ۱۱۱۱۱ تأیید کنید.')
    } catch (error: unknown) {
      const m = ensureMappedError(error)
      toast.error(m.message)
    } finally {
      setLoading(false)
    }
  }

  async function onDevTrialVerifyOtp() {
    try {
      setLoading(true)
      await loginWithOtp(DEV_FIXED_TEST_MOBILE, DEV_FIXED_TEST_OTP)
      toast.success('ورود آزمایشی با OTP انجام شد.')
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
      <div className="card p-5 dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]">
        <h1 className="amline-display text-[var(--amline-primary)]">ورود به اَملاین</h1>
        <p className="amline-body mt-2">
          برای مدیریت قراردادها ابتدا با شماره موبایل وارد شوید.
        </p>

        {step === 'mobile' ? (
          <form onSubmit={onSendOtp} className="mt-6 space-y-4" noValidate>
            <label className="label block" htmlFor="mobile">
              شماره موبایل
            </label>
            <input
              id="mobile"
              type="tel"
              inputMode="numeric"
              dir="ltr"
              className="input dark:border-slate-700 dark:bg-slate-950/30"
              placeholder="0912xxxxxxx"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
            <button type="submit" disabled={loading} className="btn btn-primary w-full min-h-[48px] font-semibold">
              {loading ? 'در حال ارسال...' : 'ارسال کد تأیید'}
            </button>
            {devBypass ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void onDevTrialSendOtp()}
                className="btn btn-outline w-full border-amber-400 text-amber-900 dark:border-amber-600 dark:text-amber-200"
              >
                ارسال کد آزمایشی (۰۹۱۰۰۰۰۰۰۰۰۰)
              </button>
            ) : null}
          </form>
        ) : (
          <form onSubmit={onLogin} className="mt-6 space-y-4" noValidate>
            <label className="label block" htmlFor="otp">
              کد تأیید
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              dir="ltr"
              className="input dark:border-slate-700 dark:bg-slate-950/30"
              placeholder="کد ۴ تا ۶ رقمی"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button type="submit" disabled={loading} className="btn btn-primary w-full min-h-[48px] font-semibold">
              {loading ? 'در حال ورود...' : 'ورود'}
            </button>
            {devBypass ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void onDevTrialVerifyOtp()}
                className="btn btn-outline w-full border-amber-400 text-amber-900 dark:border-amber-600 dark:text-amber-200"
              >
                تأیید آزمایشی توسعه ({DEV_FIXED_TEST_OTP})
              </button>
            ) : null}
          </form>
        )}

        {devBypass ? (
          <button
            type="button"
            data-testid="e2e-dev-login"
            onClick={() => {
              devLogin()
              toast.success('ورود آزمایشی انجام شد.')
              router.replace('/contracts')
            }}
            className="btn btn-outline mt-3 w-full dark:border-slate-700"
          >
            ورود آزمایشی توسعه (بدون OTP)
          </button>
        ) : null}

        <div className="amline-caption mt-5">
          <Link href="/" className="text-[var(--amline-primary)] hover:underline">
            بازگشت به خانه
          </Link>
        </div>
      </div>
    </main>
  )
}
