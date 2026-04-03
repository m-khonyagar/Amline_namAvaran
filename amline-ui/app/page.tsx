import Link from 'next/link'
import { ArrowLeft, FileText, LogIn, PenLine, Sparkles, WalletCards } from 'lucide-react'

type ActionItem = {
  href: string
  title: string
  description: string
  icon: typeof LogIn
  emphasis: 'primary' | 'default'
}

const ACTIONS: ActionItem[] = [
  {
    href: '/login',
    title: 'ورود با OTP',
    description: 'ورود امن با شماره موبایل و کد یک‌بارمصرف',
    icon: LogIn,
    emphasis: 'default',
  },
  {
    href: '/contracts',
    title: 'قراردادها',
    description: 'مشاهده وضعیت و جزئیات قراردادهای خود',
    icon: FileText,
    emphasis: 'primary',
  },
  {
    href: '/contracts/wizard',
    title: 'قرارداد جدید',
    description: 'ویزارد گام‌به‌گام برای شروع انعقاد قرارداد',
    icon: PenLine,
    emphasis: 'default',
  },
  {
    href: '/billing',
    title: 'اشتراک و فاکتور',
    description: 'مدیریت اشتراک و سوابق پرداخت',
    icon: WalletCards,
    emphasis: 'default',
  },
]

export default function HomePage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden px-4 py-10 sm:px-6 sm:py-14">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        aria-hidden
      >
        <div className="absolute -left-32 top-0 h-72 w-72 rounded-full bg-[var(--amline-primary)]/10 blur-3xl dark:bg-blue-500/15" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-[var(--amline-accent)]/10 blur-3xl dark:bg-teal-500/10" />
      </div>

      <div className="mx-auto max-w-lg">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--amline-border)] bg-[var(--amline-surface)] px-3 py-1 text-xs font-medium text-[var(--amline-fg-muted)] shadow-[var(--amline-shadow-sm)] dark:border-slate-700 dark:bg-slate-900/80">
          <Sparkles className="h-3.5 w-3.5 text-[var(--amline-primary)]" strokeWidth={2} aria-hidden />
          پنل کاربری اَملاین
        </div>
        <h1 className="amline-display text-balance text-[var(--amline-fg)]">
          مدیریت قراردادهای ملکی
        </h1>
        <p className="mt-4 text-pretty text-sm leading-relaxed text-[var(--amline-fg-muted)] sm:text-base">
          نقش کاتب، طرف قرارداد یا شاهد را از یک مکان منسجم پیگیری کنید؛ جریان ورود و شروع قرارداد
          ساده و سریع طراحی شده است.
        </p>

        <ul className="mt-10 space-y-3 sm:space-y-4">
          {ACTIONS.map(({ href, title, description, icon: Icon, emphasis }) => {
            const isPrimary = emphasis === 'primary'
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`group flex min-h-[4.5rem] items-start gap-4 rounded-2xl border px-4 py-4 shadow-[var(--amline-shadow-sm)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--amline-shadow-md)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amline-ring)] active:translate-y-0 sm:min-h-[3.75rem] sm:items-center ${
                    isPrimary
                      ? 'border-[var(--amline-primary)]/35 bg-[var(--amline-surface)] text-[var(--amline-primary)] dark:border-blue-500/40 dark:bg-[var(--amline-surface-elevated)]'
                      : 'border-[var(--amline-border)] bg-[var(--amline-surface)] text-[var(--amline-fg)] hover:border-[var(--amline-border-strong)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)] dark:hover:border-slate-600'
                  } `}
                >
                  <span
                    className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 sm:mt-0 ${
                      isPrimary
                        ? 'bg-[var(--amline-primary-muted)] text-[var(--amline-primary)] group-hover:bg-[var(--amline-primary)]/20'
                        : 'bg-[var(--amline-surface-muted)] text-[var(--amline-fg-muted)] group-hover:bg-[var(--amline-primary-muted)] group-hover:text-[var(--amline-primary)]'
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-right">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold">{title}</span>
                      <ArrowLeft
                        className="h-4 w-4 shrink-0 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                        aria-hidden
                      />
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--amline-fg-muted)] sm:text-sm">
                      {description}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        <p className="mt-10 text-center text-xs text-[var(--amline-fg-subtle)] sm:text-sm">
          برای شروع، «ورود با OTP» را بزنید یا مستقیم سراغ قراردادها بروید.
        </p>
      </div>
    </main>
  )
}
