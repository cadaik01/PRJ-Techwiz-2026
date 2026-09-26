import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { adminApi } from '../../../api/admin/adminApi';
import { QUERY_KEYS } from '@/config/constants';

function invalidateFarmers(queryClient

 ) {
  void queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.ADMIN_FARMERS()[0]],
  });
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_DASHBOARD });
}

export function useAdminFarmers(params                = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_FARMERS(params),
    queryFn: () => adminApi.getFarmers(params),
  });
}

export function useAdminFarmer(id        , enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_FARMER(id),
    queryFn: () => adminApi.getFarmer(id),
    enabled: enabled && Number.isFinite(id),
  });
}

export function useAdminFarmerImpact(id        , enabled = false) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_FARMER_IMPACT(id),
    queryFn: () => adminApi.getFarmerImpact(id),
    enabled: enabled && Number.isFinite(id),
  });
}

export function useApproveFarmer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.approveFarmer,
    onSuccess: () => {
      toast.success('Stall approved');
      invalidateFarmers(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useRejectFarmer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }                                ) =>
      adminApi.rejectFarmer(id, reason),
    onSuccess: () => {
      toast.success('Application declined');
      invalidateFarmers(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useSuspendFarmer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }                                ) =>
      adminApi.suspendFarmer(id, reason),
    onSuccess: () => {
      toast.success('Stall suspended');
      invalidateFarmers(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useReinstateFarmer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.reinstateFarmer,
    onSuccess: () => {
      toast.success('Stall restored');
      invalidateFarmers(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function fetchFarmerImpact(id        ) {
  return adminApi.getFarmerImpact(id);
}

export function useUpdateFarmer(id        ) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload                                             ) =>
      adminApi.updateFarmer(id, payload),
    onSuccess: () => {
      toast.success('Stall updated');
      void invalidateFarmers(queryClient);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_FARMER(id) });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
