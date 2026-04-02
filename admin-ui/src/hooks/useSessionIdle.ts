import { useEffect, useRef, useState, useCallback } from 'react'

const DEFAULT_WARN_MS = 25 * 60 * 1000
const DEFAULT_LOGOUT_MS = 30 * 60 * 1000

type Options = {
  onLogout: () => void
  warnMs?: number
  logoutMs?: number
  enabled?: boolean
}

/**
 * هشدار قبل از خروج اجباری به‌خاطر بیکاری (تقریبی؛ بر اساس رویدادهای صفحه).
 */
export function useSessionIdle({ onLogout, warnMs = DEFAULT_WARN_MS, logoutMs = DEFAULT_LOGOUT_MS, enabled = true }: Options) {
  const [showWarn, setShowWarn] = useState(false)
  const last = useRef(Date.now())
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const outTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bump = useCallback(() => {
    last.current = Date.now()
    setShowWarn(false)
    if (warnTimer.current) clearTimeout(warnTimer.current)
    if (outTimer.current) clearTimeout(outTimer.current)
    if (!enabled) return

    warnTimer.current = setTimeout(() => setShowWarn(true), warnMs)
    outTimer.current = setTimeout(() => {
      onLogout()
      setShowWarn(false)
    }, logoutMs)
  }, [enabled, warnMs, logoutMs, onLogout])

  useEffect(() => {
    if (!enabled) return
    bump()
    const ev = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const
    const onAct = () => {
      if (Date.now() - last.current > 30_000) bump()
    }
    ev.forEach((e) => window.addEventListener(e, onAct, { passive: true }))
    return () => {
      ev.forEach((e) => window.removeEventListener(e, onAct))
      if (warnTimer.current) clearTimeout(warnTimer.current)
      if (outTimer.current) clearTimeout(outTimer.current)
    }
  }, [bump, enabled])

  const dismissWarn = useCallback(() => {
    setShowWarn(false)
    bump()
  }, [bump])

  return { showWarn, dismissWarn }
}
