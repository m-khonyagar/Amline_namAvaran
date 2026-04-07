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

/** پیش‌نمایش URL ورود از کانال — پس از صدور توکن واقعی جایگزین `token` شود. */
export function buildChannelHandoffPreview(params: {
  baseUrl: string;
  channel: string;
  externalUserId: string;
  nextPath?: string;
}): string {
  const base = params.baseUrl.replace(/\/$/, '');
  const u = new URL(`${base}/auth/channel-handoff`);
  u.searchParams.set('channel', params.channel);
  u.searchParams.set('ext_uid', params.externalUserId);
  if (params.nextPath) u.searchParams.set('next', params.nextPath);
  return u.toString();
}
