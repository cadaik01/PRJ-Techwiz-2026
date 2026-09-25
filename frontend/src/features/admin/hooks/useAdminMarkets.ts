import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { adminApi } from '@/features/admin/api/adminApi';
import { QUERY_KEYS } from '@/config/constants';
import type { AdminMarketPayload, PageSize } from '@/types';

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
      toast.success(vars.active ? 'Đã kích hoạt' : 'Đã ngừng chợ');
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
      toast.success(isEdit ? 'Đã cập nhật chợ' : 'Đã tạo chợ');
      void invalidateMarkets(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
