import axiosClient from '@/lib/axiosClient';
import {
  adaptFarmerProduct,
  adaptFarmerProductPage,
} from '@/lib/adapters/catalog.adapter';
import { adaptPaginated } from '@/lib/adapters/pagination.adapter';
import type {
  DayOfWeek,
  FarmerDashboard,
  FarmerMarketMembership,
  FarmerOrderDetail,
  FarmerOrderTabCounts,
  FarmerOrderSummary,
  FarmerProduct,
  FarmerProductPayload,
  FarmerProfile,
  FarmerReviewItem,
  PageSize,
  PaginatedData,
  PickupSlot,
  PickingListRow,
  StockTemplatePreview,
} from '@/types';

export const farmerApi = {
  getDashboard: async (params: { from?: string; to?: string } = {}) => {
    const { data } = await axiosClient.get<FarmerDashboard>('/dashboard/', {
      params,
    });
    return data;
  },

  getOrderCounts: async () => {
    const { data } = await axiosClient.get<FarmerOrderTabCounts>('/orders/counts/');
    return data;
  },

  getOrders: async (params: {
    tab?: 'pending' | 'accepted' | 'ready' | 'history' | 'overdue';
    q?: string;
    market_id?: number;
    pickup_date?: string;
    page?: number;
    page_size?: PageSize;
  }) => {
    const { data } = await axiosClient.get('/orders/', { params });
    return adaptPaginated<FarmerOrderSummary>(data);
  },

  getOrder: async (id: number) => {
    const { data } = await axiosClient.get<FarmerOrderDetail>(`/orders/${id}/`);
    return data;
  },

  acceptOrder: async (id: number, version: number) => {
    const { data } = await axiosClient.post<FarmerOrderDetail>(
      `/orders/${id}/accept/`,
      {},
      { ifMatch: String(version) },
    );
    return data;
  },

  declineOrder: async (id: number, reason: string, version: number) => {
    const { data } = await axiosClient.post<FarmerOrderDetail>(
      `/orders/${id}/decline/`,
      { reason },
      { ifMatch: String(version) },
    );
    return data;
  },

  readyOrder: async (id: number, version: number) => {
    const { data } = await axiosClient.post<FarmerOrderDetail>(
      `/orders/${id}/ready/`,
      {},
      { ifMatch: String(version) },
    );
    return data;
  },

  completeOrder: async (id: number, version: number) => {
    const { data } = await axiosClient.post<FarmerOrderDetail>(
      `/orders/${id}/complete/`,
      {},
      { ifMatch: String(version) },
    );
    return data;
  },

  noShowOrder: async (id: number, version: number) => {
    const { data } = await axiosClient.post<FarmerOrderDetail>(
      `/orders/${id}/no-show/`,
      {},
      { ifMatch: String(version) },
    );
    return data;
  },

  getPickingList: async (pickup_date: string) => {
    const { data } = await axiosClient.get<PickingListRow[]>('/picking-list/', {
      params: { pickup_date },
    });
    return Array.isArray(data) ? data : [];
  },

  getProducts: async (
    params: {
      state?: 'in_stock' | 'out_of_stock' | 'unavailable' | 'hidden' | 'archived';
      q?: string;
      category_id?: number;
      page?: number;
      page_size?: PageSize;
    } = {},
  ) => {
    const { data } = await axiosClient.get('/products/', { params });
    return adaptFarmerProductPage(data);
  },

  getProduct: async (id: number) => {
    const { data } = await axiosClient.get<FarmerProduct>(`/products/${id}/`);
    return data ? adaptFarmerProduct(data) : null;
  },

  createProduct: async (payload: FarmerProductPayload) => {
    const { data } = await axiosClient.post<FarmerProduct>('/products/', payload);
    const product = adaptFarmerProduct(data);
    if (!product) throw new Error('Product response missing id');
    return product;
  },

  updateProduct: async (id: number, payload: Partial<FarmerProductPayload>) => {
    const { data } = await axiosClient.patch<FarmerProduct>(`/products/${id}/`, payload);
    const product = adaptFarmerProduct(data);
    if (!product) throw new Error('Product response missing id');
    return product;
  },

  markSoldOut: async (id: number) => {
    const { data } = await axiosClient.post<FarmerProduct>(
      `/products/${id}/mark-sold-out/`,
    );
    return data;
  },

  archiveProduct: async (id: number) => {
    const { data } = await axiosClient.post<FarmerProduct>(`/products/${id}/archive/`);
    return data;
  },

  getStockTemplatePreview: async () => {
    const { data } = await axiosClient.get<StockTemplatePreview>(
      '/weekly-template/preview/',
    );
    return data;
  },

  applyStockTemplate: async () => {
    const { data } = await axiosClient.post<{ applied: boolean }>(
      '/weekly-template/apply/',
    );
    return data;
  },

  getMarkets: async () => {
    const { data } = await axiosClient.get<
      FarmerMarketMembership[] | PaginatedData<FarmerMarketMembership>
    >('/farmer-markets/');
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.results;
  },

  addMarket: async (payload: { market_id: number; stall_label: string }) => {
    const { data } = await axiosClient.post<FarmerMarketMembership>(
      '/farmer-markets/',
      payload,
    );
    return data;
  },

  updateMarket: async (
    farmerMarketId: number,
    payload: Partial<{ stall_label: string }>,
  ) => {
    const { data } = await axiosClient.patch<FarmerMarketMembership>(
      `/farmer-markets/${farmerMarketId}/`,
      payload,
    );
    return data;
  },

  removeMarket: async (farmerMarketId: number) => {
    await axiosClient.delete(`/farmer-markets/${farmerMarketId}/`);
  },

  createPickupSlot: async (payload: {
    farmer_market_id: number;
    day_of_week: DayOfWeek;
    start_time: string;
    end_time: string;
  }) => {
    const { data } = await axiosClient.post<PickupSlot>('/pickup-slots/', payload);
    return data;
  },

  updatePickupSlot: async (
    slotId: number,
    payload: Partial<{
      day_of_week: DayOfWeek;
      start_time: string;
      end_time: string;
      is_active: boolean;
    }>,
  ) => {
    const { data } = await axiosClient.patch<PickupSlot>(
      `/pickup-slots/${slotId}/`,
      payload,
    );
    return data;
  },

  deletePickupSlot: async (slotId: number) => {
    await axiosClient.delete(`/pickup-slots/${slotId}/`);
  },

  getProfile: async () => {
    const { data } = await axiosClient.get<FarmerProfile>('/farmer-profiles/me/');
    return data;
  },

  updateProfile: async (
    payload: Partial<{
      stall_name: string;
      contact_person: string;
      phone: string;
      address: string;
      description: string | null;
      latitude: number | null;
      longitude: number | null;
      order_cutoff_hours: number;
    }>,
  ) => {
    const { data } = await axiosClient.patch<FarmerProfile>(
      '/farmer-profiles/me/',
      payload,
    );
    return data;
  },

  getReviews: async (
    params: {
      type?: 'FARMER' | 'PRODUCT';
      rating?: number;
      replied?: boolean;
      page?: number;
      page_size?: PageSize;
    } = {},
  ) => {
    const { data } = await axiosClient.get('/reviews/', {
      params: {
        ...params,
        replied:
          params.replied === undefined ? undefined : params.replied ? 'true' : 'false',
      },
    });
    return adaptPaginated<FarmerReviewItem>(data);
  },

  replyReview: async (id: number, reply: string) => {
    const { data } = await axiosClient.post<FarmerReviewItem>(`/reviews/${id}/reply/`, {
      reply,
    });
    return data;
  },
};
