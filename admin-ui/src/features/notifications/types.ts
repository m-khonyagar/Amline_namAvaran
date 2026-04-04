export type AdminNotification = {
  id: string;
  title: string;
  body?: string;
  read: boolean;
  created_at?: string;
  type?: string;
};

export type AdminNotificationsResponse = {
  items: AdminNotification[];
  total: number;
  unread_count: number;
};
