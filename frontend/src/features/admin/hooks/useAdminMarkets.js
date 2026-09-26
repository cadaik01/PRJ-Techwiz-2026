import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/ApiError';
import { adminApi } from '@/features/admin/api/adminApi';
import { QUERY_KEYS } from '@/config/constants';
function invalidateMarkets(queryClient) {
    return queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_MARKETS()[0]],
    });
}
export function useAdminMarkets(params = {}) {
    return useQuery({
        queryKey: QUERY_KEYS.ADMIN_MARKETS(params),
        queryFn: () => adminApi.getMarkets(params),
    });
}
export function useAdminMarket(id, enabled = true) {
    return useQuery({
        queryKey: QUERY_KEYS.ADMIN_MARKET(id),
        queryFn: () => adminApi.getMarket(id),
        enabled: enabled && Number.isFinite(id),
    });
}
export function useToggleAdminMarket() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, active }) => {
            if (active)
                return adminApi.activateMarket(id);
            return adminApi.deactivateMarket(id);
        },
        onSuccess: (_d, vars) => {
            toast.success(vars.active ? 'Market activated' : 'Market deactivated');
            void invalidateMarkets(queryClient);
        },
        onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
    });
}
export function useSaveAdminMarket(marketId) {
    const queryClient = useQueryClient();
    const isEdit = marketId !== undefined && Number.isFinite(marketId);
    return useMutation({
        mutationFn: async (payload) => {
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
