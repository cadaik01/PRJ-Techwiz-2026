import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/features/admin/api/adminApi';
import { QUERY_KEYS } from '@/config/constants';
import type { PageSize } from '@/types';

type AuditLogParams = {
  action?: string;
  user?: string;
  from?: string;
  to?: string;
  page?: number;
  page_size?: PageSize;
};

export function useAdminAuditLogs(params: AuditLogParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_AUDIT_LOGS(params),
    queryFn: () => adminApi.getAuditLogs(params),
  });
}
