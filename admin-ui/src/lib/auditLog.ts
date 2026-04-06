/**
 * Client-side audit log helper.
 * Sends a fire-and-forget POST to /admin/audit-events (best-effort; errors are swallowed).
 */
import { apiClient } from './api';

export async function logAudit(
  event: string,
  resource: string,
  data?: Record<string, unknown>
): Promise<void> {
  try {
    await apiClient.post('/admin/audit-events', {
      event,
      resource,
      ...(data ? { data } : {}),
      ts: new Date().toISOString(),
    });
  } catch {
    // Audit log failure must never break the UI
  }
}
