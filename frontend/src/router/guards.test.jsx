import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '@/lib/axiosClient';
import { GuestOnly, RequireAuth, RequireRole } from '@/router/guards';
import { useAuthStore } from '@/stores/auth.store';

const ME = (role) => ({
  success: true, message: 'OK', errors: {},
  data: { id: 1, email: 'a@b.co', role, display_name: 'A', farmer_status: null },
});

let mock;

beforeEach(() => {
  mock = new MockAdapter(axiosClient);
  useAuthStore.getState().clearSession();
});

afterEach(() => {
  mock.restore();
});

/**
 * Renders `guard` around the single route at `guarded`; every redirect target sits outside the
 * guard, so a bounce lands somewhere instead of being re-guarded forever.
 */
function renderGuard(guard, { at, guarded = at, page = 'protected page' }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route element={guard}>
            <Route path={guarded} element={<p>{page}</p>} />
          </Route>
          <Route path="/login" element={<p>sign in</p>} />
          <Route path="/403" element={<p>no access</p>} />
          <Route path="/customer" element={<p>customer overview</p>} />
          <Route path="/farmer" element={<p>farmer workspace</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function signIn(role) {
  useAuthStore.getState().setTokens({ access: 'a', refresh: 'r', role });
  mock.onGet('/auth/me/').reply(200, ME(role));
}

describe('RequireAuth', () => {
  it('sends a signed-out visitor to the sign-in page', async () => {
    renderGuard(<RequireAuth />, { at: '/secret' });

    expect(await screen.findByText('sign in')).toBeInTheDocument();
  });

  it('lets a signed-in account through', async () => {
    signIn('CUSTOMER');

    renderGuard(<RequireAuth />, { at: '/secret' });

    expect(await screen.findByText('protected page')).toBeInTheDocument();
  });
});

describe('RequireRole', () => {
  it('sends the wrong role to 403, not to the page', async () => {
    signIn('FARMER');

    renderGuard(<RequireRole allow={['CUSTOMER']} />, { at: '/secret' });

    expect(await screen.findByText('no access')).toBeInTheDocument();
    expect(screen.queryByText('protected page')).not.toBeInTheDocument();
  });

  it('lets the right role through', async () => {
    signIn('CUSTOMER');

    renderGuard(<RequireRole allow={['CUSTOMER']} />, { at: '/secret' });

    expect(await screen.findByText('protected page')).toBeInTheDocument();
  });

  it('shows neither the page nor 403 while the account is still loading', async () => {
    // A flash of the wrong screen is what the skeleton is there to prevent.
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r', role: 'CUSTOMER' });
    mock.onGet('/auth/me/').reply(() => new Promise(() => {}));

    renderGuard(<RequireRole allow={['CUSTOMER']} />, { at: '/secret' });

    await waitFor(() => {
      expect(screen.queryByText('protected page')).not.toBeInTheDocument();
      expect(screen.queryByText('no access')).not.toBeInTheDocument();
    });
  });
});

describe('GuestOnly', () => {
  it('lets a visitor reach the sign-in page', async () => {
    renderGuard(<GuestOnly />, { at: '/signin-form', page: 'sign-in form' });

    expect(await screen.findByText('sign-in form')).toBeInTheDocument();
  });

  it('bounces a signed-in customer to their own overview (C-00)', async () => {
    signIn('CUSTOMER');

    renderGuard(<GuestOnly />, { at: '/signin-form', page: 'sign-in form' });

    expect(await screen.findByText('customer overview')).toBeInTheDocument();
  });

  it('bounces a signed-in farmer to their workspace', async () => {
    signIn('FARMER');

    renderGuard(<GuestOnly />, { at: '/signin-form', page: 'sign-in form' });

    expect(await screen.findByText('farmer workspace')).toBeInTheDocument();
  });
});
