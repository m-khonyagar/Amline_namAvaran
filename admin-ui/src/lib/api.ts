/**
 * Shared Axios client — تمام مسیرهای ادمین باید با `apiV1()` از `apiPaths.ts` ساخته شوند (`/api/v1/...`).
 * در dev با baseURL خالی، Vite به `VITE_DEV_PROXY_TARGET` برای `/api/v1` و `/financials` پروکسی می‌کند.
 */
import axios from 'axios'
import { generateRequestId } from '@amline/ui-core'
import { notifySessionExpired } from '../auth/authSession'
import { AMLINE_API_V1_PREFIX } from './apiPaths'
import { CookieNames, getCookie } from './cookies'
import { mapAxiosLikeError } from './errorMapper'

/** درخواست‌هایی که 401 آن‌ها به معنای «پاک کردن نشست» نیست (رمز/OTP اشتباه و غیره). */
function isCredentialSubmissionRequest(config: { url?: string; baseURL?: string }): boolean {
  const path = `${config.baseURL ?? ''}${config.url ?? ''}`.replace(/^https?:\/\/[^/]+/i, '')
  return (
    path.includes(`${AMLINE_API_V1_PREFIX}/admin/login`) ||
    path.includes(`${AMLINE_API_V1_PREFIX}/admin/otp/send`)
  )
}

function getViteEnv(name: string): string | undefined {
  try {
    const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env
    const value = env?.[name]
    return value === undefined || value === null ? undefined : String(value)
  } catch {
    return undefined
  }
}

/** وقتی کد ادمین داخل `amline-ui` (Next) باندل می‌شود، `NEXT_PUBLIC_*` در دسترس است. */
function getNextPublicEnv(name: string): string | undefined {
  try {
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } })
      .process
    const raw = proc?.env?.[name]
    if (raw === undefined || raw === null) return undefined
    const s = String(raw).trim()
    return s === '' ? undefined : s
  } catch {
    return undefined
  }
}

function resolveBaseUrl(): string {
  const viteApiUrl = getViteEnv('VITE_API_URL')
  if (viteApiUrl && viteApiUrl.trim() !== '') return viteApiUrl.trim()
  const nextBase =
    getNextPublicEnv('NEXT_PUBLIC_API_BASE_URL') || getNextPublicEnv('NEXT_PUBLIC_DEV_PROXY_TARGET')
  if (nextBase) return nextBase
  return ''
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 120_000,
})

apiClient.interceptors.request.use((config) => {
  const hdr = config.headers
  if (hdr) {
    const hasId =
      typeof hdr.get === 'function'
        ? hdr.get('X-Request-Id')
        : (hdr as Record<string, unknown>)['X-Request-Id']
    if (!hasId && typeof hdr.set === 'function') {
      hdr.set('X-Request-Id', generateRequestId())
    }
  }
  const token = document.cookie
    .split('; ')
    .find((r) => r.startsWith('access_token='))
    ?.split('=')
    .slice(1)
    .join('=')
  if (token) {
    const raw = decodeURIComponent(token)
    const normalized = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`
    config.headers.Authorization = normalized
  }
  const devPerms = getViteEnv('VITE_DEV_USER_PERMISSIONS')
  const isViteDev = getViteEnv('DEV') === 'true'
  if (isViteDev && devPerms) {
    config.headers['X-User-Permissions'] = String(devPerms)
  }
  const devUid = getViteEnv('VITE_DEV_USER_ID')
  if (isViteDev && devUid) {
    config.headers['X-User-Id'] = String(devUid)
  } else {
    try {
      const rawUser = getCookie(CookieNames.USER)
      if (rawUser) {
        const user = JSON.parse(decodeURIComponent(rawUser)) as { id?: string }
        if (user?.id) config.headers['X-User-Id'] = user.id
      }
    } catch {
      /* ignore */
    }
  }
  try {
    const agencyId = localStorage.getItem('amline_x_agency_id')
    if (agencyId && agencyId.trim()) {
      config.headers['X-Agency-Id'] = agencyId.trim()
    }
  } catch {
    /* ignore storage errors */
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined
    const cfg = err.config
    if (status === 401 && cfg && !isCredentialSubmissionRequest(cfg)) {
      notifySessionExpired()
    }
    return Promise.reject(mapAxiosLikeError(err))
  }
)
