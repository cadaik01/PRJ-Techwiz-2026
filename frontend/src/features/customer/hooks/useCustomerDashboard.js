import { useQuery } from '@tanstack/react-query';
import { customerApi } from '@/features/customer/api/customerApi';
import { QUERY_KEYS } from '@/config/constants';
export function useCustomerDashboard() {
    return useQuery({
        queryKey: QUERY_KEYS.CUSTOMER_DASHBOARD,
        queryFn: customerApi.getDashboard,
    });
}
