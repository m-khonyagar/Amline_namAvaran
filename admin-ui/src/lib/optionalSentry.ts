import * as Sentry from '@sentry/react'

/**
 * با `VITE_SENTRY_DSN` در env استقرار (نه در ریپو).
 * در dev به‌طور پیش‌فرض خاموش است مگر `VITE_SENTRY_DEV=true`.
 */
export function initOptionalSentry(): void {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim()
  if (!dsn) return
  const allowDev = import.meta.env.VITE_SENTRY_DEV === 'true'
  if (import.meta.env.DEV && !allowDev) return

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.12 : 1,
  })
}

export { Sentry }
