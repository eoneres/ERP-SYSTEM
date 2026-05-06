import { get, patch } from './client';

export type NotificationType = 'info' | 'success' | 'warning' | 'danger';

export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  resourceUrl?: string;
  resourceType?: string;
  resourceId?: string;
  createdAt: string;
}

export const notificationsApi = {
  getAll:      (unread?: boolean) =>
    get<Notification[]>('/notifications', unread ? { unread: 'true' } : {}),
  getUnreadCount: () =>
    get<{ count: number }>('/notifications/unread-count'),
  markRead:    (id: string) =>
    patch<void>(`/notifications/${id}/read`, {}),
  markAllRead: () =>
    patch<void>('/notifications/read-all', {}),
};
