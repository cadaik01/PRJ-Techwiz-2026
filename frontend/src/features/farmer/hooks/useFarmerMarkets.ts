import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { catalogApi } from '@/features/catalog/api/catalogApi';
import { farmerApi } from '@/features/farmer/api/farmerApi';
import { QUERY_KEYS } from '@/config/constants';
import type { DayOfWeek } from '@/types';

function invalidateFarmerMarkets(queryClient: {
  invalidateQueries: (opts: { queryKey: readonly unknown[] }) => unknown;
}) {
  return queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.FARMER_MARKETS,
  });
}

export function useFarmerMarkets() {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_MARKETS,
    queryFn: farmerApi.getMarkets,
  });
}

export function usePublicMarketsForJoin() {
  return useQuery({
    queryKey: QUERY_KEYS.MARKETS(),
    queryFn: () => catalogApi.getMarkets({ page_size: 20 }),
  });
}

export function useAddFarmerMarket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { market_id: number; stall_label: string }) =>
      farmerApi.addMarket(payload),
    onSuccess: () => {
      toast.success('Market added');
      void invalidateFarmerMarkets(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useUpdateFarmerMarketStall() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      farmerMarketId,
      stall_label,
    }: {
      farmerMarketId: number;
      stall_label: string;
    }) => farmerApi.updateMarket(farmerMarketId, { stall_label }),
    onSuccess: () => {
      toast.success('Stall label saved');
      void invalidateFarmerMarkets(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useRemoveFarmerMarket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (farmerMarketId: number) => farmerApi.removeMarket(farmerMarketId),
    onSuccess: () => {
      toast.success('Left market');
      void invalidateFarmerMarkets(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useCreatePickupSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      farmer_market_id: number;
      day_of_week: DayOfWeek;
      start_time: string;
      end_time: string;
    }) => farmerApi.createPickupSlot(payload),
    onSuccess: () => {
      toast.success('Pickup slot added');
      void invalidateFarmerMarkets(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useTogglePickupSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slotId, is_active }: { slotId: number; is_active: boolean }) =>
      farmerApi.updatePickupSlot(slotId, { is_active }),
    onSuccess: () => {
      void invalidateFarmerMarkets(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
