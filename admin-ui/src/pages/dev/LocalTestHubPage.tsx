import { Link } from 'react-router-dom'
import { ExternalLink, FlaskConical } from 'lucide-react'
import {
  LOCAL_TEST_HUB_ROUTES,
  LOCAL_TEST_HUB_SAMPLE_USER_ID,
} from '../../lib/localTestHubRoutes'

const groups = [...new Set(LOCAL_TEST_HUB_ROUTES.map((r) => r.group))]

export default function LocalTestHubPage() {
  const viewAll =
    import.meta.env.DEV && import.meta.env.VITE_DEV_VIEW_ALL_PAGES === 'true'

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-3 border-b border-[var(--amline-border)] pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-amline-md bg-[var(--amline-primary-muted)] text-[var(--amline-primary)]">
            <FlaskConical className="h-5 w-5" strokeWidth={2} aria-hidden />
          </div>
          <div>
            <h1 className="amline-title text-[var(--amline-fg)]">تست لوکال — همهٔ مسیرها</h1>
            <p className="amline-caption mt-1">
              فقط در حالت توسعه (Vite <code className="rounded bg-[var(--amline-surface-muted)] px-1">DEV</code>) در دسترس است.
            </p>
          </div>
        </div>
        <div className="rounded-amline-md border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">دسترسی به صفحات محافظت‌شده با RBAC</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--amline-fg-muted)] dark:text-amber-200/90">
            <li>
              با <strong>MSW</strong> یا کاربر mock که همهٔ permissionها را دارد وارد شوید؛ یا
            </li>
            <li>
              در <code className="rounded bg-black/5 px-1 dark:bg-white/10">admin-ui/.env.local</code> مقدار{' '}
              <code className="rounded bg-black/5 px-1 dark:bg-white/10">VITE_DEV_VIEW_ALL_PAGES=true</code> بگذارید و سرور dev را
              دوباره اجرا کنید — در این حالت <strong>فقط در dev</strong> همهٔ صفحات بدون خطای دسترسی باز می‌شوند.
            </li>
          </ul>
          <p className="mt-2 text-xs">
            وضعیت فعلی دور زدن گارد:{' '}
            <strong>{viewAll ? 'فعال' : 'غیرفعال'}</strong>
          </p>
        </div>
        <p className="amline-body text-[var(--amline-fg-muted)]">
          شناسهٔ نمونه کاربر برای لینک‌ها:{' '}
          <code className="rounded bg-[var(--amline-surface-muted)] px-1 font-mono text-sm">
            {LOCAL_TEST_HUB_SAMPLE_USER_ID}
          </code>
        </p>
      </header>

      {groups.map((group) => (
        <section key={group} className="space-y-3">
          <h2 className="amline-page-eyebrow text-[var(--amline-fg)]">{group}</h2>
          <ul className="space-y-2">
            {LOCAL_TEST_HUB_ROUTES.filter((r) => r.group === group).map((row) => (
              <li
                key={row.path}
                className="flex flex-wrap items-center justify-between gap-3 rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface)] px-4 py-3"
              >
                <div className="min-w-0 flex-1 text-right">
                  <Link
                    to={row.path}
                    className="font-medium text-[var(--amline-primary)] hover:underline"
                  >
                    {row.label}
                  </Link>
                  <p className="amline-caption mt-0.5 font-mono text-[10px] opacity-80 [direction:ltr]">
                    {row.path}
                  </p>
                  {row.permission ? (
                    <p className="amline-caption mt-1 text-[var(--amline-fg-muted)]">
                      مجوز: {row.permission}
                    </p>
                  ) : null}
                  {row.hint ? (
                    <p className="mt-1 text-xs text-[var(--amline-fg-muted)]">{row.hint}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    to={row.path}
                    className="inline-flex items-center gap-1 rounded-amline-md border border-[var(--amline-border)] px-2 py-1 text-xs text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)]"
                  >
                    باز کردن
                  </Link>
                  <a
                    href={row.path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-amline-md border border-[var(--amline-border)] px-2 py-1 text-xs text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    تب جدید
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
