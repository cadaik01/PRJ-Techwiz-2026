import axiosClient from '@/lib/axiosClient';
import {
  adaptFarmerPage,
  adaptFarmerSummary,
  adaptMarketDetail,
  adaptMarketPage,
  adaptProductDetail,
  adaptProductPage,
} from '@/lib/adapters/catalog.adapter';

function toParams(
  input                                                                         ,
) {
  const params                                            = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      params[key] = value.join(',');
      continue;
    }
    params[key] = value;
  }
  return params;
}

export const catalogApi = {
  getConfig: async () => {
    const { data } = await axiosClient.get              ('/config/');
    return data;
  },

  getCategories: async () => {
    const { data } = await axiosClient.get                                      (
      '/categories/',
    );
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.results;
  },

  getMarkets: async (query               = {}) => {
    const { data } = await axiosClient.get('/markets/', {
      params: toParams({ ...query }),
    });
    return adaptMarketPage(data);
  },

  getMarket: async (id        , coords                                 ) => {
    const { data } = await axiosClient.get        (`/markets/${id}/`, {
      params: toParams({ lat: coords?.lat, lng: coords?.lng }),
    });
    return data ? adaptMarketDetail(data) : null;
  },

  getMarketFarmers: async (marketId        , day            ) => {
    const { data } = await axiosClient.get(`/markets/${marketId}/farmers/`, {
      params: toParams({ day }),
    });
    if (!data) return [];
    if (Array.isArray(data))
      return data.flatMap((item) => {
        const farmer = adaptFarmerSummary(item);
        return farmer ? [farmer] : [];
      });
    return adaptFarmerPage(data).results;
  },

  getFarmers: async (query               = {}) => {
    const { data } = await axiosClient.get('/farmers/', {
      params: toParams({ ...query }),
    });
    return adaptFarmerPage(data);
  },

  getFarmer: async (id        ) => {
    const { data } = await axiosClient.get              (`/farmers/${id}/`);
    if (!data) return null;
    const summary = adaptFarmerSummary(data);
    if (!summary) return null;
    return {
      ...data,
      ...summary,
      markets: data.markets ?? summary.markets,
      upcoming_closures: data.upcoming_closures ?? [],
      pickup_windows: data.pickup_windows ?? [],
    };
  },

  getFarmerPickupOptions: async (id        , opts                                   ) => {
    const { data } = await axiosClient.get                (
      `/farmers/${id}/pickup-options/`,
      { params: toParams({ from: opts?.from, days: opts?.days }) },
    );
    return Array.isArray(data) ? data : [];
  },

  getFarmerReviews: async (
    id        ,
    page = 1,
    page_size           = 10,
    rating         ,
  ) => {
    const { data } = await axiosClient.get             (`/farmers/${id}/reviews/`, {
      params: toParams({ page, page_size, rating }),
    });
    return data;
  },

  getProducts: async (query                = {}) => {
    const { ids, category, ...rest } = query;
    const { data } = await axiosClient.get('/products/', {
      params: toParams({
        ...rest,
        ids,
        category,
      }),
    });
    return adaptProductPage(data);
  },

  getProduct: async (id        ) => {
    const { data } = await axiosClient.get               (`/products/${id}/`);
    return data ? adaptProductDetail(data) : null;
  },

  getProductReviews: async (id        , page = 1, page_size           = 10) => {
    const { data } = await axiosClient.get             (`/products/${id}/reviews/`, {
      params: { page, page_size },
    });
    return data;
  },

  getAnnouncements: async () => {
    const { data } = await axiosClient.get                                              (
      '/announcements/',
    );
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.results;
  },

  chat: async (messages                      ) => {
    const { data } = await axiosClient.post           ('/chat/messages/', {
      messages,
    });
    return data;
  },
};
