/**
 * قرارداد واحد HTTP — همهٔ درخواست‌های ادمین به `/api/v1/...`
 * (بک‌اند همان روتر را روی ریشه هم سوار کرده؛ فرانت فقط canonical را هدف می‌گیرد.)
 */
export const AMLINE_API_V1_PREFIX = '/api/v1' as const

/** مسیر نسبی بدون پیشوند، مثال: `admin/metrics/summary` یا `contracts/list` */
export function apiV1(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, '')
  return `${AMLINE_API_V1_PREFIX}/${trimmed}`
}
