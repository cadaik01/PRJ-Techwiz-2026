import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { adminApi } from '@/api/admin/adminApi';
import { QUERY_KEYS } from '@/config/constants';
import type { ReviewType } from '@/types';

// A product needs only its id; a review also needs the table its id belongs to.
export type ModerationTarget =
  | { type: 'product'; id: number }
  | { type: 'review'; id: number; reviewType: ReviewType };

function invalidateModeration(queryClient: {
  invalidateQueries: (opts: { queryKey: readonly unknown[] }) => unknown;
}) {
  // Only the first key segment, so every sort order of the list is refreshed.
  void queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.ADMIN_MODERATION_PRODUCTS()[0]],
  });
  void queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.ADMIN_MODERATION_REVIEWS()[0]],
  });
}

export function useModerationProducts(params: { ordering?: string } = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_MODERATION_PRODUCTS(params),
    queryFn: () => adminApi.getModerationProducts(params),
  });
}

export function useModerationReviews(params: { ordering?: string } = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_MODERATION_REVIEWS(params),
    queryFn: () => adminApi.getModerationReviews(params),
  });
}

export function useHideModerationItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ModerationTarget & { reason: string }) => {
      if (input.type === 'product') {
        return adminApi.hideProduct(input.id, input.reason);
      }
      // Which review table the id belongs to decides the route (AD-23 vs AD-24).
      return adminApi.hideReview(input.id, input.reviewType, input.reason);
    },
    onSuccess: () => {
      toast.success('Content hidden from shoppers');
      invalidateModeration(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useRestoreModerationProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.restoreProduct,
    onSuccess: () => {
      toast.success('Content restored');
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_MODERATION_PRODUCTS()[0]],
      });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useRestoreModerationReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: number; reviewType: ReviewType }) =>
      adminApi.restoreReview(input.id, input.reviewType),
    onSuccess: () => {
      toast.success('Content restored');
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ADMIN_MODERATION_REVIEWS()[0]],
      });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
