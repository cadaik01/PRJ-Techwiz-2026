import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { adminApi } from '../../../api/admin/adminApi';
import { QUERY_KEYS } from '@/config/constants';

function invalidateCustomers(queryClient) {
  return queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.ADMIN_CUSTOMERS()[0]],
  });
}

export function useAdminCustomers(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_CUSTOMERS(params),
    queryFn: () => adminApi.getCustomers(params),
    // The client defaults to a 30s staleTime, which is wrong for a list being searched and
    // moderated: the answer has to be what the server holds now.
    staleTime: 0,
    // Keeps the previous results on screen while the next query runs, so the table does not
    // blink empty between keystrokes.
    placeholderData: (previous) => previous,
  });
}

export function useDeactivateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }) => adminApi.deactivateCustomer(id, reason),
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
    mutationFn: (id) => adminApi.activateCustomer(id),
    onSuccess: () => {
      toast.success('Account unlocked');
      void invalidateCustomers(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function fetchCustomerImpact(id) {
  return adminApi.getCustomerImpact(id);
}

// AD-10, behind /admin/customers/:id. id is null on any route without one.
export function useAdminCustomer(id) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_CUSTOMER(id ?? 0),
    queryFn: () => adminApi.getCustomer(id),
    enabled: id !== null,
  });
}

export function useUpdateCustomer(id) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.updateCustomer(id, payload),
    onSuccess: () => {
      toast.success('Customer updated');
      void invalidateCustomers(queryClient);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_CUSTOMER(id) });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
