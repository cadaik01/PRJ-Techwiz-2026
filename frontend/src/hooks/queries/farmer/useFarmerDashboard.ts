import { useQuery } from '@tanstack/react-query';

import { farmerApi } from '@/api/farmer/farmerApi';
import { QUERY_KEYS } from '@/config/constants';

export function useFarmerDashboard(params: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_DASHBOARD(params),
    queryFn: () => farmerApi.getDashboard(params),
  });
}
