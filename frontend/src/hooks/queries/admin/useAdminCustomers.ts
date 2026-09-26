import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { adminApi } from '@/api/admin/adminApi';
import { QUERY_KEYS } from '@/config/constants';
import type { PageSize } from '@/types';

type CustomersParams = {
  q?: string;
  is_active?: boolean;
  ordering?: string;
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
      toast.success('Account locked');
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
      toast.success('Account unlocked');
      void invalidateCustomers(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function fetchCustomerImpact(id: number) {
  return adminApi.getCustomerImpact(id);
}


// AD-10, behind /admin/customers/:id. id is null on any route without one.
export function useAdminCustomer(id: number | null) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_CUSTOMER(id ?? 0),
    queryFn: () => adminApi.getCustomer(id as number),
    enabled: id !== null,
  });
}

export function useUpdateCustomer(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof adminApi.updateCustomer>[1]) =>
      adminApi.updateCustomer(id, payload),
    onSuccess: () => {
      toast.success('Customer updated');
      void invalidateCustomers(queryClient);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_CUSTOMER(id) });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
