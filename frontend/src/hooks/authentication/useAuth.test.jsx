import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '@/lib/axiosClient';
import { useAuth } from '@/hooks/authentication/useAuth';
import { useAuthStore } from '@/stores/auth.store';

const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => navigate,
}));

const CUSTOMER = {
  id: 4, email: 'alice@example.com', role: 'CUSTOMER', display_name: 'Alice Nguyen', farmer_status: null,
};

function wrapper({ children }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

let mock;

beforeEach(() => {
  navigate.mockClear();
  mock = new MockAdapter(axiosClient);
  useAuthStore.getState().clearSession();
});

afterEach(() => {
  mock.restore();
});

describe('signing in', () => {
  it('lands a customer on the dashboard route of Pass 3', async () => {
    mock.onPost('/auth/login/').reply(200, {
      success: true, message: 'OK', errors: {},
      data: { access: 'a', refresh: 'r', user: CUSTOMER },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.login({ email: CUSTOMER.email, password: 'Mango2026x' });
    });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/customer', { replace: true }));
  });

  it('lands a farmer and an admin on their own workspace', async () => {
    for (const [role, path] of [['FARMER', '/farmer'], ['ADMIN', '/admin']]) {
      navigate.mockClear();
      mock.onPost('/auth/login/').reply(200, {
        success: true, message: 'OK', errors: {},
        data: { access: 'a', refresh: 'r', user: { ...CUSTOMER, role } },
      });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        result.current.login({ email: 'x@y.co', password: 'Mango2026x' });
      });

      await waitFor(() => expect(navigate).toHaveBeenCalledWith(path, { replace: true }));
    }
  });
});

describe('signing out', () => {
  it('revokes the session with the refresh token (AU-05)', async () => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r', role: 'CUSTOMER' });
    mock.onPost('/auth/logout/').reply(204);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.logout();
    });

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ refresh: 'r' });
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});

describe('changing the password', () => {
  it('keeps this device signed in (D-021, AU-07)', async () => {
    // The backend exempts the device that made the change; only other devices are signed out.
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r', role: 'CUSTOMER' });
    mock.onPost('/auth/change-password/').reply(200, { success: true, message: 'OK', data: {}, errors: {} });
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.changePassword({
        current_password: 'Mango2026x', new_password: 'Papaya2027z', confirm_password: 'Papaya2027z',
      });
    });

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(useAuthStore.getState().accessToken).toBe('a');
    expect(navigate).not.toHaveBeenCalledWith('/login', { replace: true });
  });
});
