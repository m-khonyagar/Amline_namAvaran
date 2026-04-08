/** Cookie helpers — names aligned with useAuth / LoginPage */

export const CookieNames = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
} as const

export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const row = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`))
  return row?.split('=').slice(1).join('=')
}

export function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return
  const maxAge = days * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; path=/; max-age=0`
}
