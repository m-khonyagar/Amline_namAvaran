import { fetchJson } from './fetchJson'

const ACCESS = 'access_token'
const REFRESH = 'refresh_token'
export const DEV_FIXED_TEST_MOBILE = '09100000000'
export const DEV_FIXED_TEST_OTP = '11111'

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return
  const maxAge = days * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

function removeCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; max-age=0`
}

export function hasAccessToken(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split('; ').some((r) => r.startsWith(`${ACCESS}=`))
}

export function logout(): void {
  removeCookie(ACCESS)
  removeCookie(REFRESH)
}

export function isDevBypassEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_DEV_BYPASS !== 'true') return false
  if (process.env.NODE_ENV === 'production') return false
  // Playwright گاهی NODE_ENV والد را `test` می‌گذارد؛ سرور Next آن را به ارث می‌برد.
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    process.env.NEXT_PUBLIC_E2E_DEV_BYPASS === 'true'
  )
}

export async function devLogin(): Promise<void> {
  setCookie(ACCESS, 'dev-token-12345', 1)
}

export async function sendOtp(mobile: string): Promise<void> {
  await fetchJson<unknown>('/admin/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile }),
  })
}

interface LoginResponse {
  access_token?: string
  refresh_token?: string
}

export async function loginWithOtp(mobile: string, otp: string): Promise<void> {
  const data = await fetchJson<LoginResponse>('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, otp }),
  })
  if (data.access_token) setCookie(ACCESS, data.access_token, 1)
  if (data.refresh_token) setCookie(REFRESH, data.refresh_token, 30)
}
