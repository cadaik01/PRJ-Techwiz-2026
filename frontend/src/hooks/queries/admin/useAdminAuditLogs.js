import { useQuery } from '@tanstack/react-query';

import { adminApi } from '../../../api/admin/adminApi';
import { QUERY_KEYS } from '@/config/constants';

export function useAdminAuditLogs(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_AUDIT_LOGS(params),
    queryFn: () => adminApi.getAuditLogs(params),
  });
}
