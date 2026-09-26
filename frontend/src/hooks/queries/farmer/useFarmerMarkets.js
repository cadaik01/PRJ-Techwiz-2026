import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { catalogApi } from '@/api/guest/catalogApi';
import { farmerApi } from '@/api/farmer/farmerApi';
import { QUERY_KEYS } from '@/config/constants';

function invalidateFarmerMarkets(queryClient

 ) {
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
    mutationFn: (payload                                            ) =>
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
    }

     ) => farmerApi.updateMarket(farmerMarketId, { stall_label }),
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
    mutationFn: (farmerMarketId        ) => farmerApi.removeMarket(farmerMarketId),
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
    mutationFn: (payload

     ) => farmerApi.createPickupSlot(payload),
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
    mutationFn: ({ slotId, is_active }                                        ) =>
      farmerApi.updatePickupSlot(slotId, { is_active }),
    onSuccess: () => {
      void invalidateFarmerMarkets(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
