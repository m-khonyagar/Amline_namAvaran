/**
 * localStorage-backed saved-filter / saved-view persistence.
 *
 * Usage:
 *   saveView('contracts', { statusFilter, typeFilter })
 *   const saved = loadView<ContractsView>('contracts')
 *   clearView('contracts')
 */

const PREFIX = 'amline:view:';

export function saveView<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // Ignore quota / private-mode errors
  }
}

export function loadView<T extends Record<string, unknown>>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    if (raw == null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearView(key: string): void {
  try {
    localStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    // Ignore
  }
}
