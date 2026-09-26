import axiosClient from '@/lib/axiosClient';
import {
  adaptNotification,
  adaptNotificationPage,
  type BeNotification,
} from '@/lib/adapters/notification.adapter';
import { adaptPaginated } from '@/lib/adapters/pagination.adapter';
import type {
  CreateOrdersPayload,
  CreateOrdersResult,
  CustomerDashboard,
  CustomerProfile,
  FavoriteIds,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PageSize,
  ReorderPreview,
  UnreadCount,
  UpdateOrderPayload,
} from '@/types';

export const customerApi = {
  getDashboard: async () => {
    const { data } = await axiosClient.get<CustomerDashboard>('/dashboard/');
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

  getOrders: async (params: {
    tab?: 'open' | 'history' | 'all';
    status?: OrderStatus;
    farmer_id?: number;
    page?: number;
    page_size?: PageSize;
  }) => {
    const { data } = await axiosClient.get('/orders/', { params });
    return adaptPaginated<OrderSummary>(data);
  },

  getOrder: async (id: number) => {
    const { data } = await axiosClient.get<OrderDetail>(`/orders/${id}/`);
    return data;
  },

  createOrders: async (payload: CreateOrdersPayload) => {
    const { data } = await axiosClient.post<CreateOrdersResult>('/orders/', payload, {
      idempotent: true,
    });
    return data;
  },

  updateOrder: async (id: number, payload: UpdateOrderPayload, version: number) => {
    const { data } = await axiosClient.patch<OrderDetail>(`/orders/${id}/`, payload, {
      ifMatch: String(version),
    });
    return data;
  },

  cancelOrder: async (id: number, reason: string, version: number) => {
    const { data } = await axiosClient.post<OrderDetail>(
      `/orders/${id}/cancel/`,
      { reason },
      { ifMatch: String(version) },
    );
    return data;
  },

  reorderPreview: async (id: number) => {
    const { data } = await axiosClient.get<ReorderPreview>(
      `/orders/${id}/reorder-preview/`,
    );
    return data;
  },

  reviewFarmer: async (orderId: number, payload: { rating: number; comment: string }) => {
    await axiosClient.post(`/orders/${orderId}/farmer-review/`, payload);
  },

  reviewProduct: async (
    orderId: number,
    itemId: number,
    payload: { rating: number; comment: string },
  ) => {
    await axiosClient.post(`/orders/${orderId}/items/${itemId}/review/`, payload);
  },

  getFavoriteIds: async () => {
    const { data } = await axiosClient.get<FavoriteIds>('/favorite-ids/');
    return data;
  },

  addFavoriteFarmer: async (farmerId: number) => {
    await axiosClient.post('/favorite-farmers/', {
      farmer_id: farmerId,
    });
  },

  removeFavoriteFarmer: async (farmerId: number) => {
    await axiosClient.delete(`/favorite-farmers/${farmerId}/`);
  },

  addFavoriteProduct: async (productId: number) => {
    await axiosClient.post('/favorite-products/', {
      product_id: productId,
    });
  },

  removeFavoriteProduct: async (productId: number) => {
    await axiosClient.delete(`/favorite-products/${productId}/`);
  },

  addFavoriteMarket: async (marketId: number) => {
    await axiosClient.post('/favorite-markets/', {
      market_id: marketId,
    });
  },

  removeFavoriteMarket: async (marketId: number) => {
    await axiosClient.delete(`/favorite-markets/${marketId}/`);
  },

  getNotifications: async (params: { page?: number; page_size?: PageSize } = {}) => {
    const { data } = await axiosClient.get('/notifications/', { params });
    const page = adaptPaginated<BeNotification>(data);
    return adaptNotificationPage(page);
  },

  getUnreadCount: async () => {
    const { data } = await axiosClient.get<UnreadCount>('/notifications/unread-count/');
    return data;
  },

  markNotificationRead: async (id: number) => {
    await axiosClient.post(`/notifications/${id}/read/`);
  },

  markAllNotificationsRead: async () => {
    await axiosClient.post('/notifications/read-all/');
  },

  getProfile: async () => {
    const { data } = await axiosClient.get<CustomerProfile>('/customer-profiles/me/');
    return data;
  },

  updateProfile: async (payload: {
    full_name: string;
    phone: string;
    address: string;
  }) => {
    const { data } = await axiosClient.patch<CustomerProfile>(
      '/customer-profiles/me/',
      payload,
    );
    return data;
  },
};
