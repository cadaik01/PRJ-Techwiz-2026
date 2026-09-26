import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/api/admin/adminApi';
import { QUERY_KEYS } from '@/config/constants';
import type { TrackedModel } from '@/types';

export function useAdminChangeLog(model: TrackedModel, id: number, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_CHANGE_LOG(model, id),
    queryFn: () => adminApi.getChangeLog(model, id),
    enabled: enabled && Number.isFinite(id),
  });
}
