import { useQuery } from '@tanstack/react-query';

import { farmerApi } from '@/features/farmer/api/farmerApi';
import { QUERY_KEYS } from '@/config/constants';
import type { PageSize } from '@/types';

type OrdersParams = {
  tab?: 'pending' | 'accepted' | 'ready' | 'history' | 'overdue';
  q?: string;
  market_id?: number;
  pickup_date?: string;
  page?: number;
  page_size?: PageSize;
};

export function useFarmerOrderCounts() {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_ORDER_COUNTS,
    queryFn: farmerApi.getOrderCounts,
  });
}

export function useFarmerOrders(params: OrdersParams, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_ORDERS(params),
    queryFn: () => farmerApi.getOrders(params),
    enabled,
  });
}

export function useFarmerOrder(id: string | number, enabled = true) {
  const orderId = Number(id);
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_ORDER(id),
    queryFn: () => farmerApi.getOrder(orderId),
    enabled: enabled && Number.isFinite(orderId),
  });
}

export function usePickingList(pickupDate: string, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_PICKING(pickupDate),
    queryFn: () => farmerApi.getPickingList(pickupDate),
    enabled,
  });
}
