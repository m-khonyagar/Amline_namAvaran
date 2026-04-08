import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * Hero — قرارداد به‌عنوان ارزش اصلی؛ هم‌راستا با الگوی لندینگ قراردادمحور.
 * برند فیروزه‌ای #179A9C. Tailwind + SVG.
 */

function IconShield({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M12 3l7 4v5c0 5-3 9-7 10-4-1-7-5-7-10V7l7-4z"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconKeyOtp({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        d="M7 14a4 4 0 1 1 4-4v1l2 2v3h-3v2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 18h.01M9 18h.01" strokeLinecap="round" />
    </svg>
  )
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrustChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 shadow-sm backdrop-blur-md">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#179A9C]/15 text-[#7dd3d5]">
        {icon}
      </span>
      <span className="leading-snug">{children}</span>
    </div>
  )
}

const VALUE_PILLARS = [
  {
    title: 'سریع. ساده. مطمئن.',
    body: 'قرارداد را در کمتر از ۱۰ دقیقه بسازید، امضا کنید و کد رهگیری بگیرید.',
  },
  {
    title: 'یک جریان واحد',
    body: 'از فایل تا امضا—بدون پرش بین دفتر، اسکن و پیامک‌های پراکنده.',
  },
  {
    title: 'امضای دیجیتال',
    body: 'با رمز پویا و مسیر شفاف؛ آمادهٔ ارسال برای طرف مقابل.',
  },
] as const

export type AmlineHeroProps = {
  /** e.g. "/login" — نمایش لینک ورود در هدر (پیش‌نمایش پنل) */
  adminLoginTo?: string
}

export function AmlineHero({ adminLoginTo }: AmlineHeroProps) {
  return (
    <section
      dir="rtl"
      lang="fa"
      className="relative isolate overflow-hidden bg-[#050b0f] text-slate-100"
      aria-label="قرارداد ملکی آنلاین — اَملاین"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-[20%] top-0 h-[55%] w-[70%] rounded-full bg-[#179A9C]/[0.12] blur-[120px]" />
        <div className="absolute -right-[10%] bottom-0 h-[50%] w-[60%] rounded-full bg-[#0d7377]/25 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,11,15,0)_0%,#050b0f_78%,#050b0f_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.4] [background-size:44px_44px] [background-image:linear-gradient(rgba(23,154,156,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(23,154,156,0.06)_1px,transparent_1px)]"
          aria-hidden
        />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:pb-20 lg:pt-10">
        <header className="flex animate-[fadeIn_0.5s_ease-out_both] items-center justify-between gap-4 motion-reduce:animate-none">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#179A9C] to-[#0f6d70] text-sm font-black text-white shadow-lg shadow-[#179A9C]/25"
              aria-hidden
            >
              A
            </span>
            <div className="text-right leading-tight">
              <p className="text-base font-bold tracking-tight text-white sm:text-lg">
                Amline
              </p>
              <p className="text-[11px] font-medium text-[#8ec9ca] sm:text-xs">
                ساخت قرارداد ملکی آنلاین
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {adminLoginTo ? (
              <Link
                to={adminLoginTo}
                className="rounded-xl px-2 py-2 text-xs font-semibold text-slate-400 transition hover:text-white sm:px-3 sm:text-sm"
              >
                ورود به پنل
              </Link>
            ) : null}
            <a
              href="#verify"
              className="hidden rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:text-white lg:inline-flex"
            >
              استعلام
            </a>
            <a
              href="#contract-flow"
              className="inline-flex items-center justify-center rounded-xl border border-[#179A9C]/60 bg-[#179A9C] px-3 py-2.5 text-xs font-bold text-white shadow-md shadow-[#179A9C]/25 transition hover:bg-[#138d8f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4] sm:px-5 sm:text-sm"
            >
              ساخت قرارداد
            </a>
          </div>
        </header>

        <div className="mt-12 grid items-start gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <div className="animate-[fadeIn_0.55s_ease-out_0.05s_both] motion-reduce:animate-none">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#179A9C]/30 bg-[#179A9C]/10 px-4 py-1.5 text-xs font-bold text-[#a5e3e5] sm:text-sm">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#5eead4] shadow-[0_0_10px_#5eead4]"
                  aria-hidden
                />
                تمرکز ما: قرارداد رسمی و امن
              </span>
            </div>

            <h1 className="animate-[fadeIn_0.6s_ease-out_0.1s_both] mt-6 text-balance text-3xl font-extrabold leading-[1.2] tracking-tight text-white sm:text-4xl md:text-[2.75rem] motion-reduce:animate-none">
              قرارداد ملکی در{' '}
              <span className="relative inline-block whitespace-nowrap">
                <span className="relative z-10 bg-gradient-to-l from-[#5eead4] to-[#179A9C] bg-clip-text text-transparent">
                  چند لمس
                </span>
                <span
                  className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-gradient-to-l from-[#179A9C]/80 to-[#5eead4]/50"
                  aria-hidden
                />
              </span>
              .
            </h1>

            <p className="animate-[fadeIn_0.6s_ease-out_0.14s_both] mt-5 max-w-2xl text-lg font-medium leading-relaxed text-slate-300 sm:text-xl motion-reduce:animate-none">
              از فایل تا امضا—همه‌چیز در یک جریان واحد.
            </p>

            <p className="animate-[fadeIn_0.6s_ease-out_0.18s_both] mt-4 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base motion-reduce:animate-none">
              رهن، اجاره، خرید و فروش و سایر انواع قرارداد را آنلاین تنظیم کنید؛ با کد
              رهگیری قابل‌استعلام و کارمزد شفاف.
            </p>

            <div className="animate-[fadeIn_0.6s_ease-out_0.22s_both] mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center motion-reduce:animate-none">
              <a
                href="#contract-flow"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#179A9C] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[#179A9C]/35 transition hover:bg-[#138d8f] hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5eead4]"
              >
                ساخت قرارداد
                <svg
                  className="h-5 w-5 rtl:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="#contracts"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-transparent px-8 py-4 text-base font-semibold text-white transition hover:border-[#179A9C]/50 hover:bg-[#179A9C]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#179A9C]"
              >
                مشاهده قراردادها
              </a>
            </div>

            <div className="animate-[fadeIn_0.62s_ease-out_0.26s_both] mt-10 grid gap-3 sm:grid-cols-3 motion-reduce:animate-none">
              {VALUE_PILLARS.map(({ title, body }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-right backdrop-blur-sm"
                >
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{body}</p>
                </div>
              ))}
            </div>

            <div className="animate-[fadeIn_0.65s_ease-out_0.3s_both] mt-10 grid gap-3 sm:grid-cols-3 motion-reduce:animate-none">
              <TrustChip icon={<IconShield className="h-5 w-5" />}>
                کد رهگیری رسمی و استعلام‌پذیر
              </TrustChip>
              <TrustChip icon={<IconKeyOtp className="h-5 w-5" />}>
                امضای دیجیتال با رمز پویا
              </TrustChip>
              <TrustChip icon={<IconClock className="h-5 w-5" />}>
                کمتر از ۱۰ دقیقه تا پیش‌نویس
              </TrustChip>
            </div>

            <div className="animate-[fadeIn_0.65s_ease-out_0.34s_both] mt-10 flex flex-col gap-2 border-t border-white/[0.06] pt-8 sm:flex-row sm:items-center sm:justify-between motion-reduce:animate-none">
              <p className="text-sm font-medium text-slate-400">
                <span className="text-[#7dd3d5]">✓</span> بیش از{' '}
                <span className="font-bold text-white">۲۷٬۰۰۰</span> قرارداد
                ثبت‌شده
              </p>
              <p className="text-xs text-slate-500 sm:text-sm">
                پشتیبانی ۷ روز هفته · مجوزدار
              </p>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="animate-[fadeIn_0.7s_ease-out_0.28s_both] relative motion-reduce:animate-none">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-[#179A9C]/20 via-transparent to-transparent opacity-60 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0a1218]/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-[#7dd3d5]">
                  شروع قرارداد
                </p>
                <p className="mt-2 text-center text-sm text-slate-500">
                  همین حالا نوع قرارداد را انتخاب کنید و وارد جریان ساخت شوید.
                </p>
                <a
                  href="#contract-flow"
                  className="mt-5 flex w-full items-center justify-center rounded-xl bg-[#179A9C]/15 py-3 text-sm font-bold text-[#b8e8ea] ring-1 ring-[#179A9C]/40 transition hover:bg-[#179A9C]/25"
                >
                  رفتن به مراحل ساخت قرارداد
                </a>

                <ul className="mt-6 space-y-2.5 border-t border-white/[0.06] pt-6 text-sm">
                  {[
                    ['نوع قرارداد', 'رهن و اجاره'],
                    ['کد رهگیری', 'پس از تأیید نهایی'],
                    ['امضا', 'مالک · مستأجر (رمز پویا)'],
                    ['وضعیت', 'آمادهٔ ارسال برای امضا'],
                  ].map(([k, v]) => (
                    <li
                      key={k}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.04]"
                    >
                      <span className="text-slate-500">{k}</span>
                      <span className="font-medium text-slate-200">{v}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full w-[30%] rounded-full bg-gradient-to-l from-[#179A9C] to-[#5eead4]"
                      aria-hidden
                    />
                  </div>
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-500">
                  قرارداد آنلاین با اعتبار قانونی و مسیر داوری اختلاف
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AmlineHero
