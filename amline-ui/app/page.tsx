import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="amline-display text-[var(--amline-fg)]">پنل کاربری اَملاین</h1>
      <p className="amline-body mt-3">
        قراردادهای خود، نقش کاتب، طرف قرارداد یا شاهد را از اینجا مدیریت کنید.
      </p>
      <p className="amline-caption mt-2 sm:text-sm">
        برای شروع انعقاد قرارداد، ابتدا از مسیر ورود با شماره موبایل وارد شوید.
      </p>
      <ul className="mt-8 space-y-3">
        <li>
          <Link
            href="/login"
            className="card flex min-h-[52px] items-center px-4 py-3 font-medium text-[var(--amline-fg)] transition-shadow hover:shadow-[var(--amline-shadow-md)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]"
          >
            ورود با OTP
          </Link>
        </li>
        <li>
          <Link
            href="/contracts"
            className="flex min-h-[52px] items-center rounded-[var(--amline-radius-lg)] border border-[var(--amline-primary)]/30 bg-[var(--amline-primary-muted)] px-4 py-3 font-medium text-[var(--amline-primary)] shadow-[var(--amline-shadow-sm)] transition-colors hover:border-[var(--amline-primary)]/50 dark:bg-[var(--amline-surface-elevated)]"
          >
            قراردادها
          </Link>
        </li>
        <li>
          <Link
            href="/contracts/wizard"
            className="card flex min-h-[52px] items-center px-4 py-3 font-medium text-[var(--amline-fg)] transition-shadow hover:shadow-[var(--amline-shadow-md)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]"
          >
            انعقاد قرارداد جدید
          </Link>
        </li>
      </ul>
    </main>
  )
}
