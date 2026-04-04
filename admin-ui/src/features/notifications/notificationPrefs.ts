const KEY = 'amline_desktop_notify';

export type DesktopNotifyPrefs = {
  enabled: boolean;
};

export function loadDesktopNotifyPrefs(): DesktopNotifyPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { enabled: false };
    const j = JSON.parse(raw) as DesktopNotifyPrefs;
    return { enabled: Boolean(j.enabled) };
  } catch {
    return { enabled: false };
  }
}

export function saveDesktopNotifyPrefs(p: DesktopNotifyPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
