import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import {
  catalogApi,

} from '../../../api/guest/catalogApi';
import { QUERY_KEYS } from '@/config/constants';

function toNumberId(id        )         {
  return Number(id);
}

function wrapArrayAsPage(data               )                             {
  return {
    results: data,
    count: data.length,
    total_pages: 1,
    page: 1,
    page_size: 20,
    next: null,
    previous: null,
  };
}

export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.CATEGORIES,
    queryFn: catalogApi.getCategories,
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: QUERY_KEYS.ANNOUNCEMENTS,
    queryFn: catalogApi.getAnnouncements,
  });
}

export function useMarkets(query              ) {
  return useQuery({
    queryKey: QUERY_KEYS.MARKETS(query),
    queryFn: () => catalogApi.getMarkets(query),
  });
}

export function useMarket(id        , coords                                 ) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.MARKET(id),
    queryFn: () => catalogApi.getMarket(numericId, coords),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useMarketFarmers(marketId        ) {
  const numericId = toNumberId(marketId);
  return useQuery({
    queryKey: QUERY_KEYS.MARKET_FARMERS(marketId),
    queryFn: () => catalogApi.getMarketFarmers(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useFarmers(query              ) {
  return useQuery({
    queryKey: QUERY_KEYS.FARMERS(query),
    queryFn: () => catalogApi.getFarmers(query),
  });
}

export function useFarmer(id        ) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.FARMER(id),
    queryFn: () => catalogApi.getFarmer(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useFarmerPickupOptions(id        ) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_PICKUP(id),
    queryFn: () => catalogApi.getFarmerPickupOptions(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useFarmerReviews(id        ) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_REVIEWS(id),
    queryFn: () => catalogApi.getFarmerReviews(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useFarmerProducts(id        ) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_PRODUCTS(id),
    queryFn: async () => {
      const data = await catalogApi.getProducts({
        farmer_id: numericId,
        page_size: 20,
      });
      if (Array.isArray(data)) return wrapArrayAsPage(data);
      return data;
    },
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useProducts(query               ) {
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCTS(query),
    queryFn: async () => {
      const data = await catalogApi.getProducts(query);
      if (Array.isArray(data)) return wrapArrayAsPage(data);
      return data;
    },
  });
}

export function useInfiniteProducts(query                             ) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.PRODUCTS({ ...query, infinite: true }),
    queryFn: async ({ pageParam }) => {
      const data = await catalogApi.getProducts({ ...query, page: pageParam });
      if (Array.isArray(data)) return wrapArrayAsPage(data);
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.next !== null ? last.next : undefined),
  });
}

export function useProduct(id        ) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCT(id),
    queryFn: () => catalogApi.getProduct(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useProductReviews(id        ) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCT_REVIEWS(id),
    queryFn: () => catalogApi.getProductReviews(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useProductRating(id        ) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCT_RATING(id),
    queryFn: async () => {
      const data = await catalogApi.getProductReviews(numericId);
      return data.summary;
    },
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useFarmerRating(id        ) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_RATING(id),
    queryFn: async () => {
      const data = await catalogApi.getFarmerReviews(numericId);
      return data.summary;
    },
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useSearch(q        ) {
  return useQuery({
    queryKey: QUERY_KEYS.SEARCH(q),
    queryFn: async () => {
      const [markets, products, farmers] = await Promise.all([
        catalogApi.getMarkets({ q, page_size: 5 }),
        catalogApi.getProducts({ q, page_size: 5 }),
        catalogApi.getFarmers({ q, page_size: 5 }),
      ]);
      return {
        markets: markets.results,
        products: Array.isArray(products) ? products : products.results,
        farmers: farmers.results,
      };
    },
    enabled: q.trim().length >= 2,
  });
}
