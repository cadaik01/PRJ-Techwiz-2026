import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { farmerApi } from '@/features/farmer/api/farmerApi';
import { QUERY_KEYS } from '@/config/constants';
import type { FarmerProductPayload, PageSize } from '@/types';

type ProductsParams = {
  state?: 'in_stock' | 'out_of_stock' | 'unavailable' | 'hidden' | 'archived';
  q?: string;
  category_id?: number;
  page?: number;
  page_size?: PageSize;
};

function invalidateMyProducts(queryClient: {
  invalidateQueries: (opts: { queryKey: readonly unknown[] }) => unknown;
}) {
  return queryClient.invalidateQueries({
    queryKey: [QUERY_KEYS.FARMER_MY_PRODUCTS()[0]],
  });
}

export function useFarmerMyProducts(params: ProductsParams = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_MY_PRODUCTS(params),
    queryFn: () => farmerApi.getProducts(params),
  });
}

export function useFarmerMyProduct(id: number, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_MY_PRODUCT(id),
    queryFn: () => farmerApi.getProduct(id),
    enabled: enabled && Number.isFinite(id),
  });
}

export function useSaveFarmerProduct(productId?: number) {
  const queryClient = useQueryClient();
  const isEdit = productId !== undefined && Number.isFinite(productId);

  return useMutation({
    mutationFn: async (values: FarmerProductPayload) => {
      if (isEdit && productId !== undefined) {
        return farmerApi.updateProduct(productId, values);
      }
      return farmerApi.createProduct(values);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Produce updated' : 'Produce listed');
      void invalidateMyProducts(queryClient);
    },
  });
}

export function useUpdateFarmerStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock_quantity }: { id: number; stock_quantity: number }) =>
      farmerApi.updateProduct(id, { stock_quantity }),
    onSuccess: () => {
      toast.success('Stock updated');
      void invalidateMyProducts(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useMarkSoldOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: farmerApi.markSoldOut,
    onSuccess: () => {
      toast.success('Marked as sold out');
      void invalidateMyProducts(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: farmerApi.archiveProduct,
    onSuccess: () => {
      toast.success('Item archived');
      void invalidateMyProducts(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useStockTemplatePreview() {
  return useQuery({
    queryKey: QUERY_KEYS.FARMER_STOCK_PREVIEW,
    queryFn: farmerApi.getStockTemplatePreview,
  });
}

export function useApplyStockTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: farmerApi.applyStockTemplate,
    onSuccess: () => {
      toast.success('Weekly stock reset applied');
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.FARMER_STOCK_PREVIEW,
      });
      void invalidateMyProducts(queryClient);
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
