import { useQuery } from '@tanstack/react-query';

import { farmerApi } from '@/api/farmer/farmerApi';
import { QUERY_KEYS } from '@/config/constants';

export function useFarmerOrderCounts() {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_ORDER_COUNTS,
    queryFn: farmerApi.getOrderCounts,
  });
}

export function useFarmerOrders(params              , enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_ORDERS(params),
    queryFn: () => farmerApi.getOrders(params),
    enabled,
  });
}

export function useFarmerOrder(id                 , enabled = true) {
  const orderId = Number(id);
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_ORDER(id),
    queryFn: () => farmerApi.getOrder(orderId),
    enabled: enabled && Number.isFinite(orderId),
  });
}

export function usePickingList(pickupDate        , enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_PICKING(pickupDate),
    queryFn: () => farmerApi.getPickingList(pickupDate),
    enabled,
  });
}
