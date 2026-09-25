import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { adminApi } from '@/features/admin/api/adminApi';
import { QUERY_KEYS } from '@/config/constants';

export function useAdminCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_CATEGORIES,
    queryFn: adminApi.getCategories,
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => adminApi.reorderCategories(ids),
    onSuccess: () => {
      toast.success('Đã cập nhật thứ tự');
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN_CATEGORIES,
      });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      icon?: string | null;
      display_order?: number;
    }) => adminApi.createCategory(payload),
    onSuccess: () => {
      toast.success('Đã thêm danh mục');
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN_CATEGORIES,
      });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteCategory,
    onSuccess: () => {
      toast.success('Đã xóa');
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN_CATEGORIES,
      });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
