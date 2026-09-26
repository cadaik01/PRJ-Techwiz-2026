import { useQuery } from '@tanstack/react-query';
import { farmerApi } from '@/features/farmer/api/farmerApi';
import { QUERY_KEYS } from '@/config/constants';
export function useFarmerDashboard(params = {}) {
    return useQuery({
        queryKey: QUERY_KEYS.FARMER_DASHBOARD(params),
        queryFn: () => farmerApi.getDashboard(params),
    });
}
