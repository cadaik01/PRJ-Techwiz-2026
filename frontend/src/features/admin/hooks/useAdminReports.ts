import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/features/admin/api/adminApi';
import { QUERY_KEYS } from '@/config/constants';

type ReportsParams = {
  from: string;
  to: string;
  market_id?: number;
};

export function useAdminReports(params: ReportsParams) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_REPORTS(params),
    queryFn: () => adminApi.getReports(params),
  });
}

export async function exportAdminReports(params: ReportsParams) {
  return adminApi.exportReports(params);
}
