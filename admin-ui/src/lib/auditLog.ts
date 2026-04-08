/** Client-side audit hook; extend with POST /api/v1/admin/audit when wired. */
export async function logAudit(
  action: string,
  entity: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[audit]', action, entity, metadata)
  }
}
