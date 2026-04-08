import { Link } from 'react-router-dom'
import { ExternalLink, FlaskConical } from 'lucide-react'
import {
  LOCAL_TEST_HUB_ROUTES,
  LOCAL_TEST_HUB_SAMPLE_USER_ID,
} from '../../lib/localTestHubRoutes'
import { getLocalTestHubExternalApps } from '../../lib/localTestHubExternal'

const groups = [...new Set(LOCAL_TEST_HUB_ROUTES.map((r) => r.group))]

export default function LocalTestHubPage() {
  const viewAll =
    import.meta.env.DEV && import.meta.env.VITE_DEV_VIEW_ALL_PAGES !== 'false'

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
              اگر مرورگر «اتصال رد شد» داد، از پوشهٔ <code className="rounded bg-[var(--amline-surface-muted)] px-1 font-mono text-[10px]">admin-ui</code> سرور را اجرا کنید:{' '}
              <code className="rounded bg-[var(--amline-surface-muted)] px-1 font-mono text-[10px]">npm run dev</code>
              — پورت پیش‌فرض <span className="font-mono">3002</span> است.
            </p>
          </div>
        </div>
        <div className="rounded-amline-md border border-amber-200/80 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">باز کردن مسیرهای پنل بعد از ورود</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--amline-fg-muted)] dark:text-amber-200/90">
            <li>
              در حالت <strong>dev</strong> به‌صورت پیش‌فرض گارد مجوز برای همهٔ صفحات باز است (نیازی به env نیست).
            </li>
            <li>
              برای تست واقعی RBAC در dev، در <code className="rounded bg-black/5 px-1 dark:bg-white/10">.env.local</code> مقدار{' '}
              <code className="rounded bg-black/5 px-1 dark:bg-white/10">VITE_DEV_VIEW_ALL_PAGES=false</code> بگذارید.
            </li>
          </ul>
          <p className="mt-2 text-xs">
            وضعیت فعلی دور زدن گارد در dev:{' '}
            <strong>{viewAll ? 'فعال (پیش‌فرض)' : 'غیرفعال'}</strong>
          </p>
        </div>
        <p className="amline-body text-[var(--amline-fg-muted)]">
          شناسهٔ نمونه کاربر برای لینک‌ها:{' '}
          <code className="rounded bg-[var(--amline-surface-muted)] px-1 font-mono text-sm">
            {LOCAL_TEST_HUB_SAMPLE_USER_ID}
          </code>
        </p>
        <div className="rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface-muted)]/40 p-4 text-sm text-[var(--amline-fg-muted)] dark:border-slate-600">
          <p className="font-semibold text-[var(--amline-fg)]">مشاور املاک در همین پنل (admin-ui)</p>
          <p className="mt-1">
            مسیرهای نزدیک به کار روزمرهٔ مشاور:{' '}
            <Link className="font-medium text-[var(--amline-primary)] hover:underline" to="/crm">
              CRM
            </Link>
            {'، '}
            <Link className="font-medium text-[var(--amline-primary)] hover:underline" to="/contracts/wizard">
              ویزارد قرارداد
            </Link>
            {'، '}
            <Link className="font-medium text-[var(--amline-primary)] hover:underline" to="/contracts">
              لیست قراردادها
            </Link>
            .
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="amline-page-eyebrow text-[var(--amline-fg)]">لندینگ و اپ کاربر (سرورهای جدا)</h2>
        <p className="text-sm text-[var(--amline-fg-muted)]">
          این آدرس‌ها خارج از Vite ادمین هستند؛ باید هم‌زمان در ترمینال‌های جدا اجرا شوند (یا پورت‌ها را با env
          عوض کنید).
        </p>
        {getLocalTestHubExternalApps().map((app) => (
          <div
            key={app.group}
            className="space-y-2 rounded-amline-md border border-cyan-200/60 bg-cyan-50/40 p-4 dark:border-cyan-900/40 dark:bg-cyan-950/20"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-200/90">
              {app.group}
            </p>
            <p className="font-mono text-xs text-[var(--amline-fg-muted)] [direction:ltr]">{app.baseUrl}</p>
            <ul className="space-y-2">
              {app.links.map((l) => {
                const href = `${app.baseUrl.replace(/\/$/, '')}${l.path}`
                return (
                  <li
                    key={l.path + l.label}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-amline-md border border-[var(--amline-border)] bg-[var(--amline-surface)] px-3 py-2 dark:border-slate-600"
                  >
                    <span className="text-sm font-medium text-[var(--amline-fg)]">{l.label}</span>
                    <div className="flex shrink-0 gap-2">
                      <a
                        href={href}
                        className="inline-flex items-center gap-1 rounded-amline-md border border-[var(--amline-border)] px-2 py-1 text-xs text-[var(--amline-primary)] hover:bg-[var(--amline-surface-muted)]"
                      >
                        باز کردن
                      </a>
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-amline-md border border-[var(--amline-border)] px-2 py-1 text-xs text-[var(--amline-fg-muted)] hover:bg-[var(--amline-surface-muted)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        تب جدید
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
            {app.footnote ? (
              <p className="text-xs text-[var(--amline-fg-subtle)]">{app.footnote}</p>
            ) : null}
          </div>
        ))}
      </section>

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
