import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/ApiError';
import { adminApi } from '@/features/admin/api/adminApi';
import { QUERY_KEYS } from '@/config/constants';
function invalidateModeration(queryClient) {
    void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN_MODERATION_PRODUCTS,
    });
    void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN_MODERATION_REVIEWS,
    });
}
export function useModerationProducts() {
    return useQuery({
        queryKey: QUERY_KEYS.ADMIN_MODERATION_PRODUCTS,
        queryFn: adminApi.getModerationProducts,
    });
}
export function useModerationReviews() {
    return useQuery({
        queryKey: QUERY_KEYS.ADMIN_MODERATION_REVIEWS,
        queryFn: adminApi.getModerationReviews,
    });
}
export function useHideModerationItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input) => {
            if (input.type === 'product') {
                return adminApi.hideProduct(input.id, input.reason);
            }
            return adminApi.hideReview(input.id, input.reason);
        },
        onSuccess: () => {
            toast.success('Content hidden from shoppers');
            invalidateModeration(queryClient);
        },
        onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
    });
}
export function useRestoreModerationProduct() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminApi.restoreProduct,
        onSuccess: () => {
            toast.success('Content restored');
            void queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.ADMIN_MODERATION_PRODUCTS,
            });
        },
        onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
    });
}
export function useRestoreModerationReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: adminApi.restoreReview,
        onSuccess: () => {
            toast.success('Content restored');
            void queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.ADMIN_MODERATION_REVIEWS,
            });
        },
        onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
    });
}
