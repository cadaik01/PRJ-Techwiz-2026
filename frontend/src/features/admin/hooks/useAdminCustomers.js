import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/ApiError';
import { adminApi } from '@/features/admin/api/adminApi';
import { QUERY_KEYS } from '@/config/constants';
function invalidateCustomers(queryClient) {
    return queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_CUSTOMERS()[0]],
    });
}
export function useAdminCustomers(params = {}) {
    return useQuery({
        queryKey: QUERY_KEYS.ADMIN_CUSTOMERS(params),
        queryFn: () => adminApi.getCustomers(params),
    });
}
export function useDeactivateCustomer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reason }) => adminApi.deactivateCustomer(id, reason),
        onSuccess: () => {
            toast.success('Account locked');
            void invalidateCustomers(queryClient);
        },
        onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
    });
}
export function useActivateCustomer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => adminApi.activateCustomer(id),
        onSuccess: () => {
            toast.success('Account unlocked');
            void invalidateCustomers(queryClient);
        },
        onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
    });
}
export function fetchCustomerImpact(id) {
    return adminApi.getCustomerImpact(id);
}
