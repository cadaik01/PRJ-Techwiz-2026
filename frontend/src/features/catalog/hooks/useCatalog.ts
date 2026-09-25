import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import {
  catalogApi,
  type FarmersQuery,
  type MarketsQuery,
  type ProductsQuery,
} from '@/features/catalog/api/catalogApi';
import { QUERY_KEYS } from '@/config/constants';
import type { PaginatedData, ProductCard } from '@/types';

function toNumberId(id: string): number {
  return Number(id);
}

function wrapArrayAsPage(data: ProductCard[]): PaginatedData<ProductCard> {
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

export function useMarkets(query: MarketsQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.MARKETS(query),
    queryFn: () => catalogApi.getMarkets(query),
  });
}

export function useMarket(id: string, coords?: { lat?: number; lng?: number }) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.MARKET(id),
    queryFn: () => catalogApi.getMarket(numericId, coords),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useMarketFarmers(marketId: string) {
  const numericId = toNumberId(marketId);
  return useQuery({
    queryKey: QUERY_KEYS.MARKET_FARMERS(marketId),
    queryFn: () => catalogApi.getMarketFarmers(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useFarmers(query: FarmersQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.FARMERS(query),
    queryFn: () => catalogApi.getFarmers(query),
  });
}

export function useFarmer(id: string) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.FARMER(id),
    queryFn: () => catalogApi.getFarmer(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useFarmerPickupOptions(id: string) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_PICKUP(id),
    queryFn: () => catalogApi.getFarmerPickupOptions(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useFarmerReviews(id: string) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_REVIEWS(id),
    queryFn: () => catalogApi.getFarmerReviews(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useFarmerProducts(id: string) {
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

export function useProducts(query: ProductsQuery) {
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCTS(query),
    queryFn: async () => {
      const data = await catalogApi.getProducts(query);
      if (Array.isArray(data)) return wrapArrayAsPage(data);
      return data;
    },
  });
}

export function useInfiniteProducts(query: Omit<ProductsQuery, 'page'>) {
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

export function useProduct(id: string) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCT(id),
    queryFn: () => catalogApi.getProduct(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useProductReviews(id: string) {
  const numericId = toNumberId(id);
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCT_REVIEWS(id),
    queryFn: () => catalogApi.getProductReviews(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
  });
}

export function useProductRating(id: string) {
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

export function useFarmerRating(id: string) {
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

export function useSearch(q: string) {
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
