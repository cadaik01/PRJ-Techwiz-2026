import { useQueryClient } from '@tanstack/react-query';

import { catalogApi } from '@/features/catalog/api/catalogApi';
import { QUERY_KEYS } from '@/config/constants';
import type { PaginatedData, ProductCard } from '@/types';

const DEFAULT_MARKETS = { sort: 'name' as const, page_size: 20 as const };
const DEFAULT_FARMERS = { sort: 'rating' as const, page_size: 20 as const };
const DEFAULT_PRODUCTS = { sort: 'newest' as const, page_size: 10 as const };

async function normalizeProductsPage(
  data: Awaited<ReturnType<typeof catalogApi.getProducts>>,
): Promise<PaginatedData<ProductCard>> {
  if (Array.isArray(data)) {
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
  return data;
}

/** Prefetch common public routes on hover / focus for snappier navigation. */
export function usePrefetchRoutes() {
  const queryClient = useQueryClient();

  return {
    prefetchMarkets: () => {
      void queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.MARKETS(DEFAULT_MARKETS),
        queryFn: () => catalogApi.getMarkets(DEFAULT_MARKETS),
      });
    },
    prefetchProducts: () => {
      void queryClient.prefetchInfiniteQuery({
        queryKey: QUERY_KEYS.PRODUCTS({ ...DEFAULT_PRODUCTS, infinite: true }),
        queryFn: async ({ pageParam }) => {
          const data = await catalogApi.getProducts({
            ...DEFAULT_PRODUCTS,
            page: pageParam,
          });
          return normalizeProductsPage(data);
        },
        initialPageParam: 1,
      });
    },
    prefetchFarmers: () => {
      void queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.FARMERS(DEFAULT_FARMERS),
        queryFn: () => catalogApi.getFarmers(DEFAULT_FARMERS),
      });
    },
  };
}
