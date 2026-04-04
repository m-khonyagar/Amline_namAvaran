/**
 * Shared Axios client — proxies to real FastAPI (legacy + /api/v1).
 * Base URL empty in dev: Vite proxies paths to VITE_DEV_PROXY_TARGET.
 */
import axios from 'axios'
import { CookieNames, getCookie } from './cookies'
import { mapAxiosLikeError } from './errorMapper'

function resolveBaseUrl(): string {
  const v = import.meta.env.VITE_API_URL
  if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  return ''
}

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 120_000,
})

apiClient.interceptors.request.use((config) => {
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
  const devPerms = import.meta.env.VITE_DEV_USER_PERMISSIONS
  if (import.meta.env.DEV && devPerms) {
    config.headers['X-User-Permissions'] = String(devPerms)
  }
  const devUid = import.meta.env.VITE_DEV_USER_ID
  if (import.meta.env.DEV && devUid) {
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
  (err) => Promise.reject(mapAxiosLikeError(err))
)
