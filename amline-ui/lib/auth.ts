import { CookieNames, getCookie, removeCookie, setCookie } from './cookies';
import { fetchJson } from './fetchJson';

export interface AuthUser {
  id: string;
  mobile: string;
  full_name?: string;
  role: string;
  permissions: string[];
}

/** کانون تست لوکال — هم‌تراز با dev-mock-api و بک‌اند. */
export const DEV_FIXED_TEST_MOBILE = '09100000000';
export const DEV_FIXED_TEST_OTP = '11111';

export function isDevBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_BYPASS === 'true'
  );
}

export function hasAccessToken(): boolean {
  return Boolean(getCookie(CookieNames.ACCESS_TOKEN));
}

export async function sendOtp(mobile: string): Promise<void> {
  await fetchJson('/admin/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile }),
  });
}

export async function loginWithOtp(mobile: string, otp: string): Promise<AuthUser> {
  const payload = await fetchJson<{ access_token?: string; refresh_token?: string }>('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, otp }),
  });

  if (payload.access_token) setCookie(CookieNames.ACCESS_TOKEN, payload.access_token, 1);
  if (payload.refresh_token) setCookie(CookieNames.REFRESH_TOKEN, payload.refresh_token, 30);

  const me = await fetchJson<AuthUser>('/auth/me');
  setCookie(CookieNames.USER, JSON.stringify(me), 1);
  return me;
}

export function devLogin(): AuthUser {
  const mockUser: AuthUser = {
    id: 'dev-user-001',
    mobile: DEV_FIXED_TEST_MOBILE,
    full_name: 'کاربر آزمایشی',
    role: 'user',
    permissions: ['contracts:read', 'contracts:write'],
  };
  setCookie(CookieNames.ACCESS_TOKEN, 'dev-token-12345', 1);
  setCookie(CookieNames.USER, JSON.stringify(mockUser), 1);
  return mockUser;
}

export function logout() {
  removeCookie(CookieNames.ACCESS_TOKEN);
  removeCookie(CookieNames.REFRESH_TOKEN);
  removeCookie(CookieNames.USER);
}
