import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { catalogApi } from '@/features/catalog/api/catalogApi';
import { customerApi } from '@/features/customer/api/customerApi';
import { QUERY_KEYS } from '@/config/constants';
import type { CreateOrdersPayload } from '@/types';

export function useCartProductRefresh(ids: number[]) {
  return useQuery({
    queryKey: QUERY_KEYS.PRODUCTS({ ids }),
    queryFn: async () => {
      const data = await catalogApi.getProducts({ ids });
      return Array.isArray(data) ? data : data.results;
    },
    enabled: ids.length > 0,
  });
}

export function useFarmerPickupOptionsList(farmerIds: number[]) {
  return useQueries({
    queries: farmerIds.map((farmerId) => ({
      queryKey: QUERY_KEYS.FARMER_PICKUP(farmerId),
      queryFn: () => catalogApi.getFarmerPickupOptions(farmerId),
    })),
  });
}

export function useCreateOrders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrdersPayload) => customerApi.createOrders(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ORDERS()[0]],
      });
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CUSTOMER_DASHBOARD,
      });
    },
  });
}

export function useCheckout(farmerIds: number[]) {
  const pickupQueries = useFarmerPickupOptionsList(farmerIds);
  const createOrders = useCreateOrders();
  return { pickupQueries, createOrders };
}
