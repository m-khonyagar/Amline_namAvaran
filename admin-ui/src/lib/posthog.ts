import posthog from 'posthog-js'

const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

export function initPosthog(): void {
  if (!key) return
  const sessionRecording =
    String(import.meta.env.VITE_PUBLIC_POSTHOG_SESSION_RECORDING || '').toLowerCase() === 'true'
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    persistence: 'localStorage+cookie',
    disable_session_recording: !sessionRecording,
  })
}

export { posthog }
