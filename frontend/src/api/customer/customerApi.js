import axiosClient from '@/lib/axiosClient';
import {
  adaptNotification,
  adaptNotificationPage,
} from '@/lib/adapters/notification.adapter';
import { adaptPaginated } from '@/lib/adapters/pagination.adapter';

export const customerApi = {
  getDashboard: async () => {
    const { data } = await axiosClient.get('/dashboard/');
    if (!data) {
      throw new Error('Customer dashboard response missing');
    }
    if (data.recent_notifications) {
      data.recent_notifications = data.recent_notifications.map((item) =>
        adaptNotification(item),
      );
    }
    return data;
  },

  getOrders: async (params) => {
    const { data } = await axiosClient.get('/orders/', { params });
    return adaptPaginated(data);
  },

  getOrder: async (id) => {
    const { data } = await axiosClient.get(`/orders/${id}/`);
    return data;
  },

  createOrders: async (payload) => {
    const { data } = await axiosClient.post('/orders/', payload, {
      idempotent: true,
    });
    return data;
  },

  updateOrder: async (id, payload, version) => {
    const { data } = await axiosClient.patch(`/orders/${id}/`, payload, {
      ifMatch: String(version),
    });
    return data;
  },

  cancelOrder: async (id, reason, version) => {
    const { data } = await axiosClient.post(
      `/orders/${id}/cancel/`,
      { reason },
      { ifMatch: String(version) },
    );
    return data;
  },

  reorderPreview: async (id) => {
    const { data } = await axiosClient.get(`/orders/${id}/reorder-preview/`);
    return data;
  },

  reviewFarmer: async (orderId, payload) => {
    await axiosClient.post(`/orders/${orderId}/farmer-review/`, payload);
  },

  reviewProduct: async (orderId, itemId, payload) => {
    await axiosClient.post(`/orders/${orderId}/items/${itemId}/review/`, payload);
  },

  getFavoriteIds: async () => {
    const { data } = await axiosClient.get('/favorite-ids/');
    return data;
  },

  addFavoriteFarmer: async (farmerId) => {
    await axiosClient.post('/favorite-farmers/', {
      farmer_id: farmerId,
    });
  },

  removeFavoriteFarmer: async (farmerId) => {
    await axiosClient.delete(`/favorite-farmers/${farmerId}/`);
  },

  addFavoriteProduct: async (productId) => {
    await axiosClient.post('/favorite-products/', {
      product_id: productId,
    });
  },

  removeFavoriteProduct: async (productId) => {
    await axiosClient.delete(`/favorite-products/${productId}/`);
  },

  addFavoriteMarket: async (marketId) => {
    await axiosClient.post('/favorite-markets/', {
      market_id: marketId,
    });
  },

  removeFavoriteMarket: async (marketId) => {
    await axiosClient.delete(`/favorite-markets/${marketId}/`);
  },

  getNotifications: async (params = {}) => {
    const { data } = await axiosClient.get('/notifications/', { params });
    const page = adaptPaginated(data);
    return adaptNotificationPage(page);
  },

  getUnreadCount: async () => {
    const { data } = await axiosClient.get('/notifications/unread-count/');
    return data;
  },

  markNotificationRead: async (id) => {
    await axiosClient.post(`/notifications/${id}/read/`);
  },

  markAllNotificationsRead: async () => {
    await axiosClient.post('/notifications/read-all/');
  },

  getProfile: async () => {
    const { data } = await axiosClient.get('/customer-profiles/me/');
    return data;
  },

  updateProfile: async (payload) => {
    const { data } = await axiosClient.patch('/customer-profiles/me/', payload);
    return data;
  },
};
