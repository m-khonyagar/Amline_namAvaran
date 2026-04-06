/**
 * Optional Sentry initialisation — only activates when VITE_SENTRY_DSN is set.
 * Gracefully no-ops in development / CI where Sentry is not configured.
 */

export function initOptionalSentry(): void {
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
    const dsn = env['VITE_SENTRY_DSN'];
    if (!dsn) return;

    // Dynamically import Sentry to avoid bundling it when not needed.
    void import('@sentry/react').then(({ init, browserTracingIntegration }) => {
      init({
        dsn,
        integrations: [browserTracingIntegration()],
        tracesSampleRate: 0.2,
        environment: env['VITE_ENV'] ?? 'production',
      });
    });
  } catch {
    // Never let Sentry initialisation crash the app
  }
}
