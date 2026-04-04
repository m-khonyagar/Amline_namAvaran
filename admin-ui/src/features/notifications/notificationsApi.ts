import { apiClient } from '../../lib/api';
import type { AdminNotificationsResponse } from './types';

export async function fetchAdminNotifications(params?: { unreadOnly?: boolean; limit?: number }) {
  const res = await apiClient.get<AdminNotificationsResponse>('/admin/notifications', {
    params: {
      unread_only: params?.unreadOnly ? true : undefined,
      limit: params?.limit ?? 50,
    },
  });
  return res.data;
}

export async function markNotificationRead(id: string) {
  await apiClient.post(`/admin/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead() {
  await apiClient.post('/admin/notifications/read-all');
}

export async function createTestNotification(body: { title: string; body?: string; type?: string }) {
  const res = await apiClient.post('/admin/notifications', body);
  return res.data as { id: string };
}
