import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { adminApi } from '@/features/admin/api/adminApi';
import { QUERY_KEYS } from '@/config/constants';
import type { AdminMarketPayload, MarketClosurePayload, PageSize } from '@/types';

type MarketsParams = {
  page?: number;
  page_size?: PageSize;
};

function invalidateMarkets(queryClient: {
  invalidateQueries: (opts: { queryKey: readonly unknown[] }) => unknown;
}) {
  return queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.ADMIN_MARKETS()[0]],
  });
}

export function useAdminMarkets(params: MarketsParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_MARKETS(params),
    queryFn: () => adminApi.getMarkets(params),
  });
}

export function useAdminMarket(id: number, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_MARKET(id),
    queryFn: () => adminApi.getMarket(id),
    enabled: enabled && Number.isFinite(id),
  });
}

export function useToggleAdminMarket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      if (active) return adminApi.activateMarket(id);
      return adminApi.deactivateMarket(id);
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.active ? 'Market activated' : 'Market deactivated');
      void invalidateMarkets(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useSaveAdminMarket(marketId?: number) {
  const queryClient = useQueryClient();
  const isEdit = marketId !== undefined && Number.isFinite(marketId);

  return useMutation({
    mutationFn: async (payload: AdminMarketPayload) => {
      if (isEdit && marketId !== undefined) {
        return adminApi.updateMarket(marketId, payload);
      }
      return adminApi.createMarket(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Market updated' : 'Market created');
      void invalidateMarkets(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}


// AD-31 to AD-33. Closures hang off one market, so they get their own query key.
export function useMarketClosures(marketId: number, enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_MARKET_CLOSURES(marketId),
    queryFn: () => adminApi.getMarketClosures(marketId),
    enabled,
  });
}

export function useCreateMarketClosure(marketId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MarketClosurePayload) =>
      adminApi.createMarketClosure(marketId, payload),
    onSuccess: () => {
      toast.success('Closure period added');
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN_MARKET_CLOSURES(marketId),
      });
    },
    // A 422 RESOURCE_IN_USE lists the open orders that block the period; the message says so.
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useDeleteMarketClosure(marketId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteMarketClosure,
    onSuccess: () => {
      toast.success('Closure period removed');
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN_MARKET_CLOSURES(marketId),
      });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
