import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/ApiError';
import { QUERY_KEYS } from '@/config/constants';
import { notificationsApi } from '@/features/notifications/api/notificationsApi';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
export function useNotifications(role) {
    useNotificationSocket(true);
    const queryClient = useQueryClient();
    const listKey = [...QUERY_KEYS.NOTIFICATIONS_LIST, role];
    const query = useQuery({
        queryKey: listKey,
        queryFn: () => notificationsApi.list(),
        refetchInterval: 30_000,
    });
    const markAll = useMutation({
        mutationFn: () => notificationsApi.markAllRead(),
        onSuccess: () => {
            toast.success('All notifications marked as read');
            void queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.NOTIFICATIONS_LIST,
            });
        },
        onError: (e) => toast.error(ApiError.fromUnknown(e).friendlyMessage),
    });
    const markOne = useMutation({
        mutationFn: (id) => notificationsApi.markRead(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.NOTIFICATIONS_LIST,
            });
        },
    });
    return {
        query,
        unread: query.data?.unread_count ?? 0,
        results: query.data?.results ?? [],
        latest: (query.data?.results ?? []).slice(0, 10),
        markAll,
        markOne,
    };
}
