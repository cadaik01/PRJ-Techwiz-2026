import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { adminApi } from '@/api/admin/adminApi';
import { QUERY_KEYS } from '@/config/constants';

type AnnouncementPayload = {
  title: string;
  content: string;
  audience: 'ALL' | 'CUSTOMER' | 'FARMER';
  starts_at: string;
  ends_at?: string | null;
  is_active?: boolean;
};

export function useAdminAnnouncements() {
  return useQuery({
    queryKey: QUERY_KEYS.ADMIN_ANNOUNCEMENTS,
    queryFn: adminApi.getAnnouncements,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) => adminApi.createAnnouncement(payload),
    onSuccess: () => {
      toast.success('Announcement created');
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN_ANNOUNCEMENTS,
      });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteAnnouncement,
    onSuccess: () => {
      toast.success('Announcement removed');
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN_ANNOUNCEMENTS,
      });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}

export function useToggleAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      adminApi.updateAnnouncement(id, { is_active }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN_ANNOUNCEMENTS,
      });
    },
    onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
  });
}
