import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adaptNotification } from '@/lib/adapters/notification.adapter';
import { QUERY_KEYS } from '@/config/constants';
import { wsUrl } from '@/config/env';
import { notificationsApi } from '@/services/common/notificationsApi';
import { useAuthStore } from '@/stores/auth.store';

const POLL_INTERVAL_MS = 30_000;

/** The consumer sends {"event": "NEW_NOTIFICATION", "data": Notification} (notifications/consumers.py). */
function readNotification(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.event !== 'NEW_NOTIFICATION') return null;
  const data = raw.data;
  return data && typeof data.id === 'number' ? adaptNotification(data) : null;
}

/**
 * Live notifications (D-010, N-01). AU-08 hands out a single-use ticket, which the socket spends on
 * the handshake at /ws/notifications/?ticket=…
 *
 * On every open and reconnect the unread badge is refetched, because messages that arrived while the
 * socket was down were never pushed. If the socket cannot be established the hook falls back to
 * polling instead of hammering the server with reconnect attempts.
 */
export function useNotificationSocket(enabled) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!enabled || !accessToken) return undefined;

    let cancelled = false;
    let pollTimer;
    let socket = null;
    let polling = false;

    const refetchCounts = () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS_LIST });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CUSTOMER_DASHBOARD });
    };

    const startPolling = () => {
      if (polling || cancelled) return;
      polling = true;
      refetchCounts();
      pollTimer = setInterval(() => {
        if (!cancelled) refetchCounts();
      }, POLL_INTERVAL_MS);
    };

    async function connect() {
      let ticket;
      try {
        ({ ticket } = await notificationsApi.getWsTicket());
      } catch {
        startPolling();
        return;
      }
      if (cancelled) return;
      if (!ticket) {
        startPolling();
        return;
      }

      socket = new WebSocket(wsUrl(`/notifications/?ticket=${encodeURIComponent(ticket)}`));

      socket.onopen = refetchCounts;

      socket.onmessage = (event) => {
        let parsed;
        try {
          parsed = JSON.parse(String(event.data));
        } catch {
          return; // Ignore anything that is not JSON.
        }
        const notification = readNotification(parsed);
        if (!notification) return;
        toast.message(notification.title, { description: notification.message });
        refetchCounts();
      };

      socket.onclose = () => {
        socket = null;
        startPolling();
      };

      socket.onerror = () => {
        try {
          socket?.close();
        } catch {
          // The socket never opened; nothing to close.
        }
      };
    }

    void connect();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        try {
          socket.close();
        } catch {
          // Already closing.
        }
      }
    };
  }, [enabled, accessToken, queryClient]);
}
