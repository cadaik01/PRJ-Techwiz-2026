import { useQuery } from '@tanstack/react-query';

import { adminApi } from '../../../api/admin/adminApi';
import { QUERY_KEYS } from '@/config/constants';

export function useAdminChangeLog(model              , id        , enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_CHANGE_LOG(model, id),
    queryFn: () => adminApi.getChangeLog(model, id),
    enabled: enabled && Number.isFinite(id),
  });
}
