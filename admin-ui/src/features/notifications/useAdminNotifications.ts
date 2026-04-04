import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  fetchAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './notificationsApi';
import { useDesktopNotifications } from './useDesktopNotifications';
import { loadDesktopNotifyPrefs } from './notificationPrefs';

const POLL_MS = 45_000;

export function useAdminNotificationsFeed(enabled: boolean) {
  const [visible, setVisible] = useState(() =>
    typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
  );
  const [desktopPref, setDesktopPref] = useState(() => loadDesktopNotifyPrefs().enabled);

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const query = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => fetchAdminNotifications({ limit: 50 }),
    enabled,
    refetchInterval: enabled ? POLL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  useDesktopNotifications(enabled ? query.data?.items : undefined, {
    enabledPref: desktopPref,
    documentVisible: visible,
  });

  const qc = useQueryClient();

  const markOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-notifications'] }),
  });

  return {
    ...query,
    markOne,
    markAll,
    desktopPref,
    setDesktopPref,
    refreshPrefs: () => setDesktopPref(loadDesktopNotifyPrefs().enabled),
  };
}
