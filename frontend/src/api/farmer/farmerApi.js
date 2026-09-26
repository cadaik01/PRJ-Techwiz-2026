import axiosClient from '@/lib/axiosClient';
import {
  adaptFarmerProduct,
  adaptFarmerProductPage,
} from '@/lib/adapters/catalog.adapter';
import { adaptPaginated } from '@/lib/adapters/pagination.adapter';

export const farmerApi = {
  getDashboard: async (params                                 = {}) => {
    const { data } = await axiosClient.get                 ('/dashboard/', {
      params,
    });
    return data;
  },

  getOrderCounts: async () => {
    const { data } = await axiosClient.get                      ('/orders/counts/');
    return data;
  },

  getOrders: async (params

   ) => {
    const { data } = await axiosClient.get('/orders/', { params });
    return adaptPaginated                    (data);
  },

  getOrder: async (id        ) => {
    const { data } = await axiosClient.get                   (`/orders/${id}/`);
    return data;
  },

  acceptOrder: async (id        , version        ) => {
    const { data } = await axiosClient.post                   (
      `/orders/${id}/accept/`,
      {},
      { ifMatch: String(version) },
    );
    return data;
  },

  declineOrder: async (id        , reason        , version        ) => {
    const { data } = await axiosClient.post                   (
      `/orders/${id}/decline/`,
      { reason },
      { ifMatch: String(version) },
    );
    return data;
  },

  readyOrder: async (id        , version        ) => {
    const { data } = await axiosClient.post                   (
      `/orders/${id}/ready/`,
      {},
      { ifMatch: String(version) },
    );
    return data;
  },

  completeOrder: async (id        , version        ) => {
    const { data } = await axiosClient.post                   (
      `/orders/${id}/complete/`,
      {},
      { ifMatch: String(version) },
    );
    return data;
  },

  noShowOrder: async (id        , version        ) => {
    const { data } = await axiosClient.post                   (
      `/orders/${id}/no-show/`,
      {},
      { ifMatch: String(version) },
    );
    return data;
  },

  getPickingList: async (pickup_date        ) => {
    const { data } = await axiosClient.get                  ('/picking-list/', {
      params: { pickup_date },
    });
    return Array.isArray(data) ? data : [];
  },

  getProducts: async (
    params

      = {},
  ) => {
    const { data } = await axiosClient.get('/products/', { params });
    return adaptFarmerProductPage(data);
  },

  getProduct: async (id        ) => {
    const { data } = await axiosClient.get               (`/products/${id}/`);
    return data ? adaptFarmerProduct(data) : null;
  },

  createProduct: async (payload                      ) => {
    const { data } = await axiosClient.post               ('/products/', payload);
    const product = adaptFarmerProduct(data);
    if (!product) throw new Error('Product response missing id');
    return product;
  },

  updateProduct: async (id        , payload                               ) => {
    const { data } = await axiosClient.patch               (`/products/${id}/`, payload);
    const product = adaptFarmerProduct(data);
    if (!product) throw new Error('Product response missing id');
    return product;
  },

  markSoldOut: async (id        ) => {
    const { data } = await axiosClient.post               (
      `/products/${id}/mark-sold-out/`,
    );
    return data;
  },

  archiveProduct: async (id        ) => {
    const { data } = await axiosClient.post               (`/products/${id}/archive/`);
    return data;
  },

  getStockTemplatePreview: async () => {
    const { data } = await axiosClient.get                      (
      '/weekly-template/preview/',
    );
    return data;
  },

  applyStockTemplate: async () => {
    const { data } = await axiosClient.post                      (
      '/weekly-template/apply/',
    );
    return data;
  },

  getMarkets: async () => {
    const { data } = await axiosClient.get('/farmer-markets/');
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.results;
  },

  addMarket: async (payload                                            ) => {
    const { data } = await axiosClient.post                        (
      '/farmer-markets/',
      payload,
    );
    return data;
  },

  updateMarket: async (
    farmerMarketId        ,
    payload                                  ,
  ) => {
    const { data } = await axiosClient.patch                        (
      `/farmer-markets/${farmerMarketId}/`,
      payload,
    );
    return data;
  },

  removeMarket: async (farmerMarketId        ) => {
    await axiosClient.delete(`/farmer-markets/${farmerMarketId}/`);
  },

  createPickupSlot: async (payload

   ) => {
    const { data } = await axiosClient.post            ('/pickup-slots/', payload);
    return data;
  },

  updatePickupSlot: async (
    slotId        ,
    payload

      ,
  ) => {
    const { data } = await axiosClient.patch            (
      `/pickup-slots/${slotId}/`,
      payload,
    );
    return data;
  },

  deletePickupSlot: async (slotId        ) => {
    await axiosClient.delete(`/pickup-slots/${slotId}/`);
  },

  getProfile: async () => {
    const { data } = await axiosClient.get               ('/farmer-profiles/me/');
    return data;
  },

  updateProfile: async (
    payload

      ,
  ) => {
    const { data } = await axiosClient.patch               (
      '/farmer-profiles/me/',
      payload,
    );
    return data;
  },

  getReviews: async (
    params

      = {},
  ) => {
    const { data } = await axiosClient.get('/reviews/', {
      params: {
        ...params,
        replied:
          params.replied === undefined ? undefined : params.replied ? 'true' : 'false',
      },
    });
    return adaptPaginated                  (data);
  },

  replyReview: async (id        , reply        ) => {
    const { data } = await axiosClient.post                  (`/reviews/${id}/reply/`, {
      reply,
    });
    return data;
  },
};
