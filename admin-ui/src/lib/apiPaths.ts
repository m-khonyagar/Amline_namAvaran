/**
 * مسیرهای API نسبت به پیشوند اختیاری (مثلاً `/api/v1` پشت Caddy).
 * خالی = همان قرارداد legacy روی ریشه: `/auth/me`, `/admin/login`, ...
 */
export function apiPath(path: string): string {
  const raw = (import.meta.env.VITE_API_PREFIX as string | undefined)?.trim() ?? '';
  const base = raw.replace(/\/$/, '');
  const seg = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${seg}` : seg;
}

/** نام قدیمی؛ همان `apiPath` است */
export const apiV1 = apiPath;
