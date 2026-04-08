import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="amline-display text-[var(--amline-fg)]">پنل کاربری اَملاین</h1>
      <p className="amline-body mt-3">
        قرارداد دیجیتال، ثبت نیازمندی (خرید، رهن، معاوضه) و مرور بازار از یک نقطه در دسترس است.
      </p>
      <p className="amline-caption mt-2 sm:text-sm">
        برای بخش‌های حساس ابتدا با شماره موبایل وارد شوید.
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
            href="/needs"
            className="card flex min-h-[52px] items-center px-4 py-3 font-medium text-[var(--amline-fg)] transition-shadow hover:shadow-[var(--amline-shadow-md)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]"
          >
            ثبت نیازمندی (خرید / رهن / معاوضه)
          </Link>
        </li>
        <li>
          <Link
            href="/browse"
            className="card flex min-h-[52px] items-center px-4 py-3 font-medium text-[var(--amline-fg)] transition-shadow hover:shadow-[var(--amline-shadow-md)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]"
          >
            بازار — نیازمندی‌ها و آگهی‌ها
          </Link>
        </li>
        <li>
          <Link
            href="/wallet"
            className="card flex min-h-[52px] items-center px-4 py-3 font-medium text-[var(--amline-fg)] transition-shadow hover:shadow-[var(--amline-shadow-md)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)]"
          >
            کیف پول و پرداخت
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
        <li>
          <Link
            href="/billing"
            className="flex min-h-[52px] items-center rounded-amline border border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-3 font-medium text-[var(--amline-fg)] shadow-[var(--amline-shadow-sm)] transition-colors hover:bg-[var(--amline-surface-muted)] dark:border-slate-700 dark:bg-[var(--amline-surface-elevated)] dark:hover:bg-slate-800"
          >
            اشتراک و فاکتور
          </Link>
        </li>
      </ul>
      <p className="amline-caption mx-auto mt-8 max-w-md text-center text-[var(--amline-fg-subtle)]">
        بازار و نیازمندی از طریق API بک‌اند یا mock محلی بارگذاری می‌شود؛ پس از ورود همهٔ مسیرها از همین پنل در دسترس است.
      </p>
    </main>
  )
}
