import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/ApiError';
import { farmerApi } from '@/features/farmer/api/farmerApi';
import { QUERY_KEYS } from '@/config/constants';
export function useFarmerOrderActions(order) {
    const queryClient = useQueryClient();
    const invalidate = () => {
        void queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.FARMER_ORDERS()[0]],
        });
        void queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.FARMER_ORDER(order.id),
        });
        void queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.FARMER_ORDER_COUNTS,
        });
        void queryClient.invalidateQueries({
            queryKey: [QUERY_KEYS.FARMER_DASHBOARD()[0]],
        });
    };
    const run = useMutation({
        mutationFn: async (payload) => {
            const { action, reason } = payload;
            const version = order.version;
            if (action === 'ACCEPT')
                return farmerApi.acceptOrder(order.id, version);
            if (action === 'DECLINE')
                return farmerApi.declineOrder(order.id, reason, version);
            if (action === 'READY')
                return farmerApi.readyOrder(order.id, version);
            if (action === 'COMPLETE')
                return farmerApi.completeOrder(order.id, version);
            return farmerApi.noShowOrder(order.id, version);
        },
        onSuccess: (_data, payload) => {
            const action = payload.action;
            toast.success(action === 'ACCEPT'
                ? 'Pre-order accepted'
                : action === 'DECLINE'
                    ? 'Pre-order declined'
                    : action === 'READY'
                        ? 'Marked ready for pickup'
                        : action === 'COMPLETE'
                            ? 'Pickup completed'
                            : 'Marked as no-show');
            invalidate();
        },
        onError: (error) => {
            toast.error(ApiError.fromUnknown(error).friendlyMessage);
        },
    });
    return { run };
}
