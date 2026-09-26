import { useQuery } from '@tanstack/react-query';

import { farmerApi } from '@/features/farmer/api/farmerApi';
import { QUERY_KEYS } from '@/config/constants';

/** Stats page reuses farmer dashboard KPIs with a dedicated query-key variant. */
export function useFarmerStats() {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_DASHBOARD({ stats: true }),
    queryFn: () => farmerApi.getDashboard({}),
  });
}
