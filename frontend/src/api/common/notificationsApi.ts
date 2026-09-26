import { authApi } from '@/api/common/authApi';
import { customerApi } from '@/api/customer/customerApi';
import type { NotificationItem } from '@/types';

export type NotificationsPayload = {
  results: NotificationItem[];
  unread_count: number;
};

export const notificationsApi = {
  list: async (): Promise<NotificationsPayload> => {
    const [list, unread] = await Promise.all([
      customerApi.getNotifications({ page_size: 10 }),
      customerApi.getUnreadCount(),
    ]);
    return {
      results: list.results,
      unread_count: unread.unread_count,
    };
  },

  markRead: async (id: number) => {
    await customerApi.markNotificationRead(id);
  },

  markAllRead: async () => {
    await customerApi.markAllNotificationsRead();
  },

  getWsTicket: () => authApi.wsTicket(),
};
