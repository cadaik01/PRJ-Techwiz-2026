import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { customerApi } from '@/api/customer/customerApi';
import { QUERY_KEYS } from '@/config/constants';
import type { OrderStatus, PageSize, UpdateOrderPayload } from '@/types';

type OrdersParams = {
  tab?: 'open' | 'history' | 'all';
  status?: OrderStatus;
  farmer_id?: number;
  page?: number;
  page_size?: PageSize;
};

export function useCustomerOrders(params: OrdersParams) {
  return useQuery({
    queryKey: QUERY_KEYS.ORDERS(params),
    queryFn: () => customerApi.getOrders(params),
  });
}

export function useCustomerOrder(id: string | number, enabled = true) {
  const orderId = Number(id);
  return useQuery({
    queryKey: QUERY_KEYS.ORDER(id),
    queryFn: () => customerApi.getOrder(orderId),
    enabled: enabled && Number.isFinite(orderId),
  });
}

export function useCancelOrder(orderId: string | number) {
  const queryClient = useQueryClient();
  const id = String(orderId);

  return useMutation({
    mutationFn: ({ reason, version }: { reason: string; version: number }) =>
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

export function useUpdateOrder(orderId: string | number) {
  const queryClient = useQueryClient();
  const id = String(orderId);

  return useMutation({
    mutationFn: ({
      payload,
      version,
    }: {
      payload: UpdateOrderPayload;
      version: number;
    }) => customerApi.updateOrder(Number(orderId), payload, version),
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

export function useSubmitOrderReview(orderId: string | number) {
  const queryClient = useQueryClient();
  const id = String(orderId);

  return useMutation({
    mutationFn: async (input: {
      farmer?: { rating: number; comment: string };
      products: Array<{
        itemId: number;
        rating: number;
        comment: string;
      }>;
    }) => {
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

export function invalidateOrdersList(queryClient: {
  invalidateQueries: (opts: { queryKey: readonly unknown[] }) => unknown;
}) {
  return queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.ORDERS()[0]],
  });
}
