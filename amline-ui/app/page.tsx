import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="amline-display text-[var(--amline-fg)]">پنل کاربری اَملاین</h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--amline-fg-muted)] sm:text-base">
        قراردادهای خود، نقش کاتب، طرف قرارداد یا شاهد را از اینجا مدیریت کنید.
      </p>
      <p className="mt-2 text-xs text-[var(--amline-fg-subtle)] sm:text-sm">
        برای شروع انعقاد قرارداد، ابتدا از مسیر ورود با شماره موبایل وارد شوید.
      </p>
      <ul className="mt-8 space-y-3">
        <li>
          <Link
            href="/login"
            className="flex min-h-[52px] items-center rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-3 font-medium text-[var(--amline-fg)] shadow-[var(--amline-shadow-sm)] transition-colors hover:bg-[var(--amline-surface-muted)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)] dark:hover:bg-slate-800"
          >
            ورود با OTP
          </Link>
        </li>
        <li>
          <Link
            href="/contracts"
            className="flex min-h-[52px] items-center rounded-amline border border-[var(--amline-primary)]/25 bg-[var(--amline-surface)] px-4 py-3 font-medium text-[var(--amline-primary)] shadow-amline transition-colors hover:bg-[var(--amline-primary-muted)] dark:bg-[var(--amline-surface-elevated)] dark:hover:bg-slate-800"
          >
            قراردادها
          </Link>
        </li>
        <li>
          <Link
            href="/contracts/wizard"
            className="flex min-h-[52px] items-center rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-3 font-medium text-[var(--amline-fg)] shadow-[var(--amline-shadow-sm)] transition-colors hover:bg-[var(--amline-surface-muted)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)] dark:hover:bg-slate-800"
          >
            انعقاد قرارداد جدید
          </Link>
        </li>
        <li>
          <Link
            href="/billing"
            className="flex min-h-[52px] items-center rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-3 font-medium text-[var(--amline-fg)] shadow-[var(--amline-shadow-sm)] transition-colors hover:bg-[var(--amline-surface-muted)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)] dark:hover:bg-slate-800"
          >
            اشتراک و فاکتور
          </Link>
        </li>
      </ul>
    </main>
  )
}
