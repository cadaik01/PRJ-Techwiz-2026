import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '@/lib/axiosClient';
import { useAuthStore } from '@/stores/auth.store';
import { useNotifications } from '@/hooks/queries/common/useNotifications';

const toast = { success: vi.fn(), error: vi.fn(), message: vi.fn() };
vi.mock('sonner', () => ({
  toast: {
    success: (...a) => toast.success(...a),
    error: (...a) => toast.error(...a),
    message: (...a) => toast.message(...a),
  },
}));

const ok = (data) => ({ success: true, message: 'OK', data, errors: {} });

/** Exactly what `serialize_notification` returns. */
const NOTE = {
  id: 5,
  type: 'ORDER_ACCEPTED',
  title: 'Order accepted',
  message: 'Green Stall accepted order #31',
  target_url: '/customer/orders/31',
  is_read: false,
  read_at: null,
  created_at: '2026-09-26T09:00:00+07:00',
};

/**
 * jsdom has no way to open a real socket, so the handshake is observed through a stand-in: what URL
 * the hook dials, and what it does with a frame that arrives.
 */
class FakeSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    FakeSocket.instances.push(this);
  }

  close() {
    this.onclose?.();
  }
}

let mock;

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function countGets(url) {
  return mock.history.get.filter((request) => request.url === url).length;
}

beforeEach(() => {
  FakeSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeSocket);
  mock = new MockAdapter(axiosClient);
  mock.onGet('/notifications/').reply(200, ok([NOTE]));
  mock.onGet('/notifications/unread-count/').reply(200, ok({ unread_count: 1 }));
  mock.onPost('/auth/ws-ticket/').reply(200, ok({ ticket: 'ticket-abc', expires_in: 30 }));
  useAuthStore.getState().setTokens({ access: 'a', refresh: 'r', role: 'CUSTOMER' });
  toast.message.mockClear();
});

afterEach(() => {
  mock.restore();
  vi.unstubAllGlobals();
  useAuthStore.getState().clearSession();
});

describe('the bell data (NO-01, NO-02)', () => {
  it('reads the newest rows and the unread count together', async () => {
    const { result } = renderHook(() => useNotifications('CUSTOMER'), { wrapper });

    await waitFor(() => expect(result.current.unread).toBe(1));
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0]).toEqual(NOTE);
    // `limit` keeps the dropdown request unpaginated, and the cap is 10.
    const listRequest = mock.history.get.find((request) => request.url === '/notifications/');
    expect(listRequest.params).toEqual({ limit: 10 });
  });

  it('marks everything read through NO-04 and reloads the badge', async () => {
    mock.onPost('/notifications/read-all/').reply(200, ok({ updated: 1 }));
    const { result } = renderHook(() => useNotifications('CUSTOMER'), { wrapper });
    await waitFor(() => expect(result.current.unread).toBe(1));
    const before = countGets('/notifications/unread-count/');

    result.current.markAll.mutate();

    await waitFor(() => expect(countGets('/notifications/unread-count/')).toBeGreaterThan(before));
  });
});

describe('the live socket (D-010, AU-08)', () => {
  it('spends a one-time ticket on the handshake', async () => {
    renderHook(() => useNotifications('CUSTOMER'), { wrapper });

    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    expect(FakeSocket.instances[0].url).toContain('/notifications/?ticket=ticket-abc');
    expect(mock.history.post.some((request) => request.url === '/auth/ws-ticket/')).toBe(true);
  });

  it('announces a pushed notification and refreshes the badge', async () => {
    const { result } = renderHook(() => useNotifications('CUSTOMER'), { wrapper });
    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));
    await waitFor(() => expect(result.current.unread).toBe(1));
    const before = countGets('/notifications/unread-count/');

    FakeSocket.instances[0].onmessage({
      data: JSON.stringify({ event: 'NEW_NOTIFICATION', data: { ...NOTE, id: 6 } }),
    });

    await waitFor(() => expect(toast.message).toHaveBeenCalledWith('Order accepted', {
      description: 'Green Stall accepted order #31',
    }));
    await waitFor(() => expect(countGets('/notifications/unread-count/')).toBeGreaterThan(before));
  });

  it('ignores a frame that is not the event the consumer sends', async () => {
    renderHook(() => useNotifications('CUSTOMER'), { wrapper });
    await waitFor(() => expect(FakeSocket.instances).toHaveLength(1));

    // A well-formed notification under the wrong event name must still be ignored, or any future
    // frame the consumer adds would pop up as a toast.
    FakeSocket.instances[0].onmessage({
      data: JSON.stringify({ event: 'PONG', data: { ...NOTE, id: 7 } }),
    });
    FakeSocket.instances[0].onmessage({ data: 'not json at all' });

    expect(toast.message).not.toHaveBeenCalled();
  });

  it('stays quiet and keeps polling when no ticket can be had', async () => {
    mock.onPost('/auth/ws-ticket/').reply(503, { success: false, message: 'Unavailable', data: {}, errors: {} });
    const { result } = renderHook(() => useNotifications('CUSTOMER'), { wrapper });

    // No socket is opened, and the list still arrives through the ordinary request.
    await waitFor(() => expect(result.current.unread).toBe(1));
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it('opens no socket for a signed-out visitor', async () => {
    useAuthStore.getState().clearSession();
    renderHook(() => useNotifications('CUSTOMER'), { wrapper });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(FakeSocket.instances).toHaveLength(0);
  });
});
