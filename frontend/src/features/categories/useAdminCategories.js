import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '../../config/constants';
import { categoriesApi } from './categoriesApi';

export function useAdminCategories() {
  return useQuery({ queryKey: QUERY_KEYS.ADMIN_CATEGORIES, queryFn: categoriesApi.adminList });
}

// Field errors are left to the form (inline under each input); anything else is a toast.
function useCategoryMutation(mutationFn, successMessage) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_CATEGORIES });
    },
    onError: (error) => {
      if (!Object.keys(error.fieldErrors ?? {}).length) {
        toast.error(error.apiMessage || 'Thao tác thất bại, vui lòng thử lại');
      }
    },
  });
}

export const useCreateCategory = () =>
  useCategoryMutation(categoriesApi.create, 'Đã thêm danh mục');

export const useUpdateCategory = () =>
  useCategoryMutation(({ id, ...payload }) => categoriesApi.update(id, payload), 'Đã cập nhật danh mục');

export const useDeleteCategory = () => useCategoryMutation(categoriesApi.remove, 'Đã xóa danh mục');
