import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { farmerApi } from '@/api/farmer/farmerApi';
import { QUERY_KEYS } from '@/config/constants';
import type { PageSize } from '@/types';

type ReviewsParams = {
  type?: 'FARMER' | 'PRODUCT';
  rating?: number;
  replied?: boolean;
  page?: number;
  page_size?: PageSize;
};

export function useFarmerMyReviews(params: ReviewsParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_MY_REVIEWS(params),
    queryFn: () => farmerApi.getReviews(params),
  });
}

export function useReplyReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reply }: { id: number; reply: string }) =>
      farmerApi.replyReview(id, reply),
    onSuccess: () => {
      toast.success('Reply sent');
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.FARMER_MY_REVIEWS()[0]],
      });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
