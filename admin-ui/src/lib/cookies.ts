/**
 * Thin cookie helpers for admin-ui authentication state.
 *
 * Note: httpOnly cookies set by the backend are NOT accessible here.
 * These helpers manage client-readable cookies only (access_token, user, etc.).
 */

export const CookieNames = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'amline_user',
} as const;

export type CookieName = (typeof CookieNames)[keyof typeof CookieNames];

/** Read a cookie value by name, or null if absent. */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie
    .split('; ')
    .find((r) => r.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.split('=').slice(1).join('=')) : null;
}

/** Write a cookie with an expiry in days (default: session). */
export function setCookie(name: string, value: string, days?: number): void {
  if (typeof document === 'undefined') return;
  let expires = '';
  if (days !== undefined) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${d.toUTCString()}`;
  }
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}

/** Remove a cookie by setting its expiry to the past. */
export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
