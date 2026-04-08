const PREFIX = 'amline-admin-saved-view:'

export function saveView(id: string, payload: Record<string, unknown>): void {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}

export function loadView(id: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export function clearView(id: string): void {
  localStorage.removeItem(PREFIX + id)
}
