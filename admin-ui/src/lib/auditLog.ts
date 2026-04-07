import { apiClient } from './api'
import { CookieNames, getCookie } from './cookies'

/**
 * ثبت رویداد ممیزی در بک‌اند mock یا آینده.
 * در صورت خطا (مثلاً MSW خاموش) خطا بلعیده می‌شود تا UX قطع نشود.
 */
export async function logAudit(
  action: string,
  entity: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  let user_id: string | undefined
  try {
    const raw = getCookie(CookieNames.USER)
    if (raw) {
      const u = JSON.parse(raw) as { id?: string }
      user_id = u.id
    }
  } catch {
    /* ignore */
  }
  try {
    await apiClient.post('/admin/audit', {
      action,
      entity,
      metadata: metadata ?? {},
      ...(user_id ? { user_id } : {}),
    })
  } catch {
    /* optional telemetry */
  }
}
