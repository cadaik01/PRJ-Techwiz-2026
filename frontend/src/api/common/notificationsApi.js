import { authApi } from './authApi';
import { customerApi } from '../customer/customerApi';

export const notificationsApi = {
  list: async ()                                => {
    const [list, unread] = await Promise.all([
      customerApi.getNotifications({ page_size: 10 }),
      customerApi.getUnreadCount(),
    ]);
    return {
      results: list.results,
      unread_count: unread.unread_count,
    };
  },

  markRead: async (id        ) => {
    await customerApi.markNotificationRead(id);
  },

  markAllRead: async () => {
    await customerApi.markAllNotificationsRead();
  },

  getWsTicket: () => authApi.wsTicket(),
};
