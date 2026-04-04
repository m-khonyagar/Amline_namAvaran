import { CookieNames, removeCookie } from '../lib/cookies'

type SessionExpiredHandler = () => void

let sessionExpiredHandler: SessionExpiredHandler | null = null

/** ثبت توسط AuthProvider؛ هنگام 401 سراسری فراخوانی می‌شود. */
export function registerSessionExpiredHandler(fn: SessionExpiredHandler): () => void {
  sessionExpiredHandler = fn
  return () => {
    if (sessionExpiredHandler === fn) sessionExpiredHandler = null
  }
}

export function clearAuthCookies(): void {
  removeCookie(CookieNames.ACCESS_TOKEN)
  removeCookie(CookieNames.REFRESH_TOKEN)
  removeCookie(CookieNames.USER)
}

/** پاک کردن کوکی‌ها + به‌روزرسانی UI (بدون reload صفحه). */
export function notifySessionExpired(): void {
  clearAuthCookies()
  sessionExpiredHandler?.()
}
