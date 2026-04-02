/**
 * لینک ورود به وب‌اپ پس از احراز هویت در ربات (Telegram Login Widget، OAuth بله، …).
 * بک‌اند باید `token` را یک‌بار مصرف و کوتاه‌عمر صادر کند.
 */
export function buildWebHandoffUrl(baseUrl: string, path: string, token: string): string {
  const u = new URL(path.startsWith('/') ? path : `/${path}`, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  u.searchParams.set('token', token);
  return u.toString();
}

export function consultantPanelDeepLink(consultantUiOrigin: string, handoffToken: string): string {
  return buildWebHandoffUrl(consultantUiOrigin, '/login', handoffToken);
}
