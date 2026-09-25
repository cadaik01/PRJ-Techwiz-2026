import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { adminApi } from '@/features/admin/api/adminApi';
import { QUERY_KEYS } from '@/config/constants';
import type { PageSize } from '@/types';

type CustomersParams = {
  q?: string;
  is_active?: boolean;
  page?: number;
  page_size?: PageSize;
};

function invalidateCustomers(queryClient: {
  invalidateQueries: (opts: { queryKey: readonly unknown[] }) => unknown;
}) {
  return queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.ADMIN_CUSTOMERS()[0]],
  });
}

export function useAdminCustomers(params: CustomersParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_CUSTOMERS(params),
    queryFn: () => adminApi.getCustomers(params),
  });
}

export function useDeactivateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminApi.deactivateCustomer(id, reason),
    onSuccess: () => {
      toast.success('Đã khóa tài khoản');
      void invalidateCustomers(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useActivateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.activateCustomer(id),
    onSuccess: () => {
      toast.success('Đã mở khóa');
      void invalidateCustomers(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function fetchCustomerImpact(id: number) {
  return adminApi.getCustomerImpact(id);
}
