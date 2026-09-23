import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import useWebSocketModule from 'react-use-websocket';

import { QUERY_KEYS, WS_EVENTS } from '../../config/constants';
import { wsUrl } from '../../config/env';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { authApi } from '../auth/authApi';
import { notificationsApi } from './notificationsApi';

// react-use-websocket ships CommonJS only. Vite 8's interop hands a default import
// the whole module.exports object, so the hook itself sits on `.default`.
const useWebSocket = useWebSocketModule.default ?? useWebSocketModule;

export function useNotifications() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const { items, unreadCount, setItems, prepend, markRead, markAllRead } =
    useNotificationStore();

  // Load rows that were written while this browser was offline. The store is the
  // render source, so the fetcher writes into it rather than the component mirroring
  // query data back with an effect.
  const { isLoading } = useQuery({
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    queryFn: async () => {
      const data = await notificationsApi.list();
      setItems(data.results ?? data);
      return data;
    },
    enabled: Boolean(accessToken),
  });

  // react-use-websocket calls this for every connection attempt, including each
  // reconnect. That matters: a ticket is burnt on redemption, so a reconnect needs
  // a fresh one and a fixed URL would fail from the second attempt on.
  const getSocketUrl = useCallback(async () => {
    const ticket = await authApi.wsTicket();
    return wsUrl(`/notifications/?ticket=${encodeURIComponent(ticket)}`);
  }, []);

  useWebSocket(
    getSocketUrl,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 5,
      reconnectInterval: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
      // Frames are {event, data}; only NEW_NOTIFICATION carries a bell item.
      onMessage: (message) => {
        try {
          const frame = JSON.parse(message.data);
          if (frame.event === WS_EVENTS.NEW_NOTIFICATION) prepend(frame.data);
        } catch {
          // Ignore frames that are not JSON.
        }
      },
    },
    Boolean(accessToken),
  );

  const read = useCallback(
    async (id) => {
      markRead(id);
      await notificationsApi.markRead(id);
    },
    [markRead],
  );

  const readAll = useCallback(async () => {
    markAllRead();
    await notificationsApi.markAllRead();
  }, [markAllRead]);

  return { items, unreadCount, isLoading, read, readAll };
}
