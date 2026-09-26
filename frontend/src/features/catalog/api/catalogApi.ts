import axiosClient from '@/lib/axiosClient';
import {
  adaptFarmerPage,
  adaptFarmerSummary,
  adaptMarketDetail,
  adaptMarketPage,
  adaptProductDetail,
  adaptProductPage,
} from '@/lib/adapters/catalog.adapter';
import type {
  Announcement,
  Category,
  ChatMessagePayload,
  ChatReply,
  DayOfWeek,
  FarmerPublic,
  FarmerSort,
  FarmerSummary,
  Market,
  MarketSort,
  PageSize,
  PaginatedData,
  PickupOption,
  ProductDetail,
  ProductSort,
  PublicConfig,
  ReviewsPage,
} from '@/types';

export type MarketsQuery = {
  lat?: number;
  lng?: number;
  day?: DayOfWeek;
  q?: string;
  ordering?: MarketSort;
  page?: number;
  page_size?: PageSize;
};

export type ProductsQuery = {
  q?: string;
  category?: number[];
  market_id?: number;
  farmer_id?: number;
  day?: DayOfWeek;
  price_min?: number;
  price_max?: number;
  in_stock?: boolean;
  ordering?: ProductSort;
  page?: number;
  page_size?: PageSize;
  ids?: number[];
};

export type FarmersQuery = {
  lat?: number;
  lng?: number;
  q?: string;
  market_id?: number;
  day?: DayOfWeek;
  category_id?: number;
  ordering?: FarmerSort;
  page?: number;
  page_size?: PageSize;
};

function toParams(
  input: Record<string, string | number | boolean | undefined | null | number[]>,
) {
  const params: Record<string, string | number | boolean> = {};
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
    const { data } = await axiosClient.get<PublicConfig>('/config/');
    return data;
  },

  getCategories: async () => {
    const { data } = await axiosClient.get<Category[] | PaginatedData<Category>>(
      '/categories/',
    );
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.results;
  },

  getMarkets: async (query: MarketsQuery = {}) => {
    const { data } = await axiosClient.get('/markets/', {
      params: toParams({ ...query }),
    });
    return adaptMarketPage(data);
  },

  getMarket: async (id: number, coords?: { lat?: number; lng?: number }) => {
    const { data } = await axiosClient.get<Market>(`/markets/${id}/`, {
      params: toParams({ lat: coords?.lat, lng: coords?.lng }),
    });
    return data ? adaptMarketDetail(data) : null;
  },

  getMarketFarmers: async (marketId: number, day?: DayOfWeek) => {
    const { data } = await axiosClient.get<
      FarmerSummary[] | PaginatedData<FarmerSummary>
    >(`/markets/${marketId}/farmers/`, {
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

  getFarmers: async (query: FarmersQuery = {}) => {
    const { data } = await axiosClient.get('/farmers/', {
      params: toParams({ ...query }),
    });
    return adaptFarmerPage(data);
  },

  getFarmer: async (id: number) => {
    const { data } = await axiosClient.get<FarmerPublic>(`/farmers/${id}/`);
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

  getFarmerPickupOptions: async (id: number, opts?: { from?: string; days?: number }) => {
    const { data } = await axiosClient.get<PickupOption[]>(
      `/farmers/${id}/pickup-options/`,
      { params: toParams({ from: opts?.from, days: opts?.days }) },
    );
    return Array.isArray(data) ? data : [];
  },

  getFarmerReviews: async (
    id: number,
    page = 1,
    page_size: PageSize = 10,
    rating?: number,
  ) => {
    const { data } = await axiosClient.get<ReviewsPage>(`/farmers/${id}/reviews/`, {
      params: toParams({ page, page_size, rating }),
    });
    return data;
  },

  getProducts: async (query: ProductsQuery = {}) => {
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

  getProduct: async (id: number) => {
    const { data } = await axiosClient.get<ProductDetail>(`/products/${id}/`);
    return data ? adaptProductDetail(data) : null;
  },

  getProductReviews: async (id: number, page = 1, page_size: PageSize = 10) => {
    const { data } = await axiosClient.get<ReviewsPage>(`/products/${id}/reviews/`, {
      params: { page, page_size },
    });
    return data;
  },

  getAnnouncements: async () => {
    const { data } = await axiosClient.get<Announcement[] | PaginatedData<Announcement>>(
      '/announcements/',
    );
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return data.results;
  },

  chat: async (messages: ChatMessagePayload[]) => {
    const { data } = await axiosClient.post<ChatReply>('/chat/messages/', {
      messages,
    });
    return data;
  },
};
