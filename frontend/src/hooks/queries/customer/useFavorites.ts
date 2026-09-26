import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { catalogApi } from '@/api/guest/catalogApi';
import { customerApi } from '@/api/customer/customerApi';
import { QUERY_KEYS } from '@/config/constants';
import { useAuthStore } from '@/stores/auth.store';
import type { FavoriteIds } from '@/types';

function emptyFavoriteIds(): FavoriteIds {
  return { farmer_ids: [], product_ids: [], market_ids: [] };
}

export function useFavoriteIds() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: QUERY_KEYS.FAVORITE_IDS,
    queryFn: customerApi.getFavoriteIds,
    enabled: Boolean(accessToken),
  });
}

function useOptimisticFavoriteToggle(
  kind: 'market' | 'farmer' | 'product',
  add: (id: number) => Promise<void>,
  remove: (id: number) => Promise<void>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const current =
        queryClient.getQueryData<FavoriteIds>(QUERY_KEYS.FAVORITE_IDS) ??
        emptyFavoriteIds();
      const listKey =
        kind === 'market'
          ? 'market_ids'
          : kind === 'farmer'
            ? 'farmer_ids'
            : 'product_ids';
      const active = current[listKey].includes(id);
      if (active) await remove(id);
      else await add(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.FAVORITE_IDS });
      const previous = queryClient.getQueryData<FavoriteIds>(QUERY_KEYS.FAVORITE_IDS);
      const base = previous ?? emptyFavoriteIds();
      const listKey =
        kind === 'market'
          ? 'market_ids'
          : kind === 'farmer'
            ? 'farmer_ids'
            : 'product_ids';
      const active = base[listKey].includes(id);
      queryClient.setQueryData<FavoriteIds>(QUERY_KEYS.FAVORITE_IDS, {
        ...base,
        [listKey]: active
          ? base[listKey].filter((x) => x !== id)
          : [...base[listKey], id],
      });
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.FAVORITE_IDS, context.previous);
      }
      toast.error(ApiError.fromUnknown(error).friendlyMessage);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FAVORITE_IDS });
    },
  });
}

export function useToggleFavoriteMarket() {
  return useOptimisticFavoriteToggle(
    'market',
    customerApi.addFavoriteMarket,
    customerApi.removeFavoriteMarket,
  );
}

export function useToggleFavoriteFarmer() {
  return useOptimisticFavoriteToggle(
    'farmer',
    customerApi.addFavoriteFarmer,
    customerApi.removeFavoriteFarmer,
  );
}

export function useToggleFavoriteProduct() {
  return useOptimisticFavoriteToggle(
    'product',
    customerApi.addFavoriteProduct,
    customerApi.removeFavoriteProduct,
  );
}

export function useFavorites() {
  const query = useFavoriteIds();
  const toggleMarketMutation = useToggleFavoriteMarket();
  const toggleFarmerMutation = useToggleFavoriteFarmer();
  const toggleProductMutation = useToggleFavoriteProduct();

  const marketIds = query.data?.market_ids ?? [];
  const farmerIds = query.data?.farmer_ids ?? [];
  const productIds = query.data?.product_ids ?? [];

  return {
    ...query,
    marketIds,
    farmerIds,
    productIds,
    hasMarket: (id: number) => marketIds.includes(id),
    hasFarmer: (id: number) => farmerIds.includes(id),
    hasProduct: (id: number) => productIds.includes(id),
    toggleMarket: (id: number) => toggleMarketMutation.mutateAsync(id),
    toggleFarmer: (id: number) => toggleFarmerMutation.mutateAsync(id),
    toggleProduct: (id: number) => toggleProductMutation.mutateAsync(id),
  };
}

/** Resolve favorite IDs into market/farmer/product cards for FavoritesPage. */
export function useFavoriteDetails() {
  const { marketIds, farmerIds, productIds } = useFavorites();

  const marketQueries = useQueries({
    queries: marketIds.map((id) => ({
      queryKey: QUERY_KEYS.FAVORITE_MARKET(id),
      queryFn: () => catalogApi.getMarket(id),
    })),
  });
  const farmerQueries = useQueries({
    queries: farmerIds.map((id) => ({
      queryKey: QUERY_KEYS.FAVORITE_FARMER(id),
      queryFn: () => catalogApi.getFarmer(id),
    })),
  });
  const productsQuery = useQuery({
    queryKey: QUERY_KEYS.FAVORITE_PRODUCTS(productIds),
    queryFn: async () => {
      const data = await catalogApi.getProducts({ ids: productIds });
      return Array.isArray(data) ? data : data.results;
    },
    enabled: productIds.length > 0,
  });

  return {
    marketIds,
    farmerIds,
    productIds,
    markets: marketQueries.map((q) => q.data).filter(Boolean),
    farmers: farmerQueries.map((q) => q.data).filter(Boolean),
    products: productsQuery.data ?? [],
    marketsLoading: marketQueries.some((q) => q.isLoading),
    farmersLoading: farmerQueries.some((q) => q.isLoading),
    productsLoading: productsQuery.isLoading,
  };
}
