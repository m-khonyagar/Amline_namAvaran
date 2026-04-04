import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { AdminNotification } from './types';
import { loadDesktopNotifyPrefs, saveDesktopNotifyPrefs } from './notificationPrefs';

function canUseDesktopNotify() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function useDesktopNotifications(
  items: AdminNotification[] | undefined,
  opts: { enabledPref: boolean; documentVisible: boolean }
) {
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!items?.length) return;
    if (!initialized.current) {
      items.forEach((i) => seenIds.current.add(i.id));
      initialized.current = true;
      return;
    }
    const prefs = loadDesktopNotifyPrefs();
    const allowDesktop = prefs.enabled && canUseDesktopNotify() && Notification.permission === 'granted';

    for (const n of items) {
      if (seenIds.current.has(n.id)) continue;
      seenIds.current.add(n.id);
      if (!n.read) {
        if (opts.documentVisible) {
          toast.info(n.title, { description: n.body, duration: 8000 });
        } else if (allowDesktop) {
          try {
            new Notification(n.title, { body: n.body ?? '', tag: n.id, lang: 'fa-IR' });
          } catch {
            /* ignore */
          }
        }
      }
    }
  }, [items, opts.documentVisible, opts.enabledPref]);
}

export function useDesktopNotifyPermission() {
  const requestPermission = useCallback(async () => {
    if (!canUseDesktopNotify()) return 'denied' as PermissionState;
    const cur = Notification.permission;
    if (cur === 'default') {
      const r = await Notification.requestPermission();
      return r;
    }
    return cur;
  }, []);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        saveDesktopNotifyPrefs({ enabled: false });
        return true;
      }
      const p = await requestPermission();
      if (p !== 'granted') {
        saveDesktopNotifyPrefs({ enabled: false });
        return false;
      }
      saveDesktopNotifyPrefs({ enabled: true });
      return true;
    },
    [requestPermission]
  );

  return { requestPermission, setEnabled, loadPrefs: loadDesktopNotifyPrefs };
}
