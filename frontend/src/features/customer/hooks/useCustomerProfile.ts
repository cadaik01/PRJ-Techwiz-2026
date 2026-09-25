import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { customerApi } from '@/features/customer/api/customerApi';
import { QUERY_KEYS } from '@/config/constants';

export function useCustomerProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.CUSTOMER_PROFILE,
    queryFn: customerApi.getProfile,
  });
}

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customerApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.CUSTOMER_PROFILE, data);
      toast.success('Profile updated');
    },
  });
}
