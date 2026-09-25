import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { farmerApi } from '@/features/farmer/api/farmerApi';
import { QUERY_KEYS } from '@/config/constants';

export function useFarmerProfile() {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_PROFILE,
    queryFn: farmerApi.getProfile,
  });
}

export function useUpdateFarmerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: farmerApi.updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.FARMER_PROFILE, data);
      toast.success('Đã cập nhật hồ sơ quầy');
    },
  });
}
