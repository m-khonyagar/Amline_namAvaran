/** Per-request correlation id (aligned with backend request logging / tracing). */
export function generateRequestId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `rid-${Date.now()}`
  }
}
