import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { customerApi } from '../../../api/customer/customerApi';
import { QUERY_KEYS } from '@/config/constants';

export function useCustomerOrders(params              ) {
  return useQuery({
    queryKey: QUERY_KEYS.ORDERS(params),
    queryFn: () => customerApi.getOrders(params),
  });
}

export function useCustomerOrder(id                 , enabled = true) {
  const orderId = Number(id);
  return useQuery({
    queryKey: QUERY_KEYS.ORDER(id),
    queryFn: () => customerApi.getOrder(orderId),
    enabled: enabled && Number.isFinite(orderId),
  });
}

export function useCancelOrder(orderId                 ) {
  const queryClient = useQueryClient();
  const id = String(orderId);

  return useMutation({
    mutationFn: ({ reason, version }                                     ) =>
      customerApi.cancelOrder(Number(orderId), reason, version),
    onSuccess: () => {
      toast.success('Pre-order cancelled');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(id) });
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ORDERS()[0]],
      });
    },
  });
}

export function useUpdateOrder(orderId                 ) {
  const queryClient = useQueryClient();
  const id = String(orderId);

  return useMutation({
    mutationFn: ({
      payload,
      version,
    }

     ) => customerApi.updateOrder(Number(orderId), payload, version),
    onSuccess: () => {
      toast.success('Pre-order updated');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(id) });
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.ORDERS()[0]],
      });
    },
  });
}

export function useReorderPreview() {
  return useMutation({
    mutationFn: customerApi.reorderPreview,
    onError: () => toast.error('Reorder preview could not be loaded'),
  });
}

export function useSubmitOrderReview(orderId                 ) {
  const queryClient = useQueryClient();
  const id = String(orderId);

  return useMutation({
    mutationFn: async (input

     ) => {
      const numericId = Number(orderId);
      if (input.farmer) {
        await customerApi.reviewFarmer(numericId, input.farmer);
      }
      for (const product of input.products) {
        await customerApi.reviewProduct(numericId, product.itemId, {
          rating: product.rating,
          comment: product.comment,
        });
      }
    },
    onSuccess: () => {
      toast.success('Thanks — your review helps other shoppers');
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(id) });
    },
    onError: (error) => toast.error(ApiError.fromUnknown(error).friendlyMessage),
  });
}

export function invalidateOrdersList(queryClient

 ) {
  return queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.ORDERS()[0]],
  });
}
