import { useQuery } from '@tanstack/react-query';

import { catalogApi } from '../../../api/guest/catalogApi';
import { QUERY_KEYS } from '@/config/constants';

const DEFAULT_CONFIG = {
  ai_chat_enabled: false,
  booking_horizon_days: 7,
  max_open_orders_total: 5,
  max_open_orders_per_farmer: 1,
  max_upload_mb: 5,
};

export function usePublicConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.PUBLIC_CONFIG,
    queryFn: catalogApi.getConfig,
    staleTime: Infinity,
  });
}

export function usePublicConfigData() {
  const query = usePublicConfig();
  return query.data ?? DEFAULT_CONFIG;
}
