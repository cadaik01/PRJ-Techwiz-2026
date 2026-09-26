import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import MockAdapter from 'axios-mock-adapter';
import axiosClient from '@/lib/axiosClient';
import { useAuthStore } from '@/stores/auth.store';
import { useCartStore } from '@/stores/cart.store';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import { PublicLayout } from '@/layouts/PublicLayout';
import { MiniCartDrawer } from '@/components/common/drawer/MiniCartDrawer';
import { UserMenu } from '@/components/common/UserMenu';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() } }));

/**
 * The shell around every customer screen. It was written against the mockup, whose routes lived under
 * `/app` and whose cart store kept `items`; the real route table is `/customer/*` (§3 route table) and
 * the store keeps `lines`. Nothing rendered these until now, so nothing caught the difference.
 */
const ok = (data) => ({ success: true, message: 'OK', data, errors: {} });

const LINE = {
  product_id: 4, farmer_id: 9, farmer_stall_name: 'Green Stall',
  name: 'Da Lat lettuce', unit: 'kg', price: '12.50', image: null,
};

let mock;

beforeEach(() => {
  mock = new MockAdapter(axiosClient);
  mock.onGet('/auth/me/').reply(200, ok({
    id: 4, email: 'alice@example.com', role: 'CUSTOMER', display_name: 'Alice Nguyen', farmer_status: null,
  }));
  mock.onGet('/notifications/').reply(200, ok([]));
  mock.onGet('/notifications/unread-count/').reply(200, ok({ unread_count: 0 }));
  mock.onGet('/public/announcements/').reply(200, ok([]));
  mock.onPost('/auth/ws-ticket/').reply(200, ok({ ticket: 't', expires_in: 30 }));
  useCartStore.getState().clear();
  localStorage.clear();
});

afterEach(() => {
  mock.restore();
  useCartStore.getState().clear();
  useAuthStore.getState().clearSession();
});

function renderShell(ui, { at = '/customer' } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[at]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CustomerLayout', () => {
  it('counts what the cart actually holds', () => {
    useCartStore.getState().addItem(LINE, 3);
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r', role: 'CUSTOMER' });

    renderShell(<CustomerLayout />);

    const cart = screen.getByRole('link', { name: /cart/i });
    expect(within(cart).getByText('3')).toBeInTheDocument();
  });

  it('points its tabs at the routes that exist', () => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r', role: 'CUSTOMER' });

    renderShell(<CustomerLayout />);

    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/customer');
    expect(screen.getByRole('link', { name: /cart/i })).toHaveAttribute('href', '/customer/cart');
    expect(screen.getByRole('link', { name: /orders/i })).toHaveAttribute('href', '/customer/orders');
    expect(screen.getByRole('link', { name: /^me$/i })).toHaveAttribute('href', '/customer/profile');
  });
});

describe('MiniCartDrawer', () => {
  it('shows the lines the cart holds', async () => {
    useCartStore.getState().addItem(LINE, 2);

    renderShell(<MiniCartDrawer />);
    await userEvent.click(screen.getByRole('button', { name: /cart/i }));

    expect(screen.getByText(/2× da lat lettuce/i)).toBeInTheDocument();
    expect(screen.getByText('Green Stall')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view cart|checkout/i })).toBeInTheDocument();
  });

  it('counts the units, not the lines', () => {
    useCartStore.getState().addItem(LINE, 4);

    renderShell(<MiniCartDrawer />);

    expect(within(screen.getByRole('button', { name: /cart/i })).getByText('4')).toBeInTheDocument();
  });
});

describe('UserMenu', () => {
  it('links to the customer pages of the route table', async () => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r', role: 'CUSTOMER' });

    renderShell(<UserMenu />);

    // The menu waits for /auth/me/ before it knows whose links to show.
    await userEvent.click(await screen.findByRole('button', { name: /account/i }));

    expect(screen.getByRole('menuitem', { name: /profile/i })).toHaveAttribute('href', '/customer/profile');
    expect(screen.getByRole('menuitem', { name: /favorites/i })).toHaveAttribute('href', '/customer/favorites');
    expect(screen.getByRole('menuitem', { name: /change password/i })).toHaveAttribute('href', '/customer/password');
  });
});

describe('PublicLayout', () => {
  it('sends a customer to their own notification page from the bell (C-09)', async () => {
    useAuthStore.getState().setTokens({ access: 'a', refresh: 'r', role: 'CUSTOMER' });
    renderShell(<PublicLayout />, { at: '/markets' });

    await userEvent.click(screen.getByRole('button', { name: /notifications/i }));

    expect(await screen.findByRole('menuitem', { name: /view all/i }))
      .toHaveAttribute('href', '/customer/notifications');
  });

  it('carries the site-wide announcements (N-04)', async () => {
    mock.onGet('/public/announcements/').reply(200, ok([{
      id: 2, title: 'Tet holiday closures', content: 'Several markets are closed.',
      audience: 'ALL', starts_at: '2026-09-20T00:00:00+07:00', ends_at: null,
    }]));

    renderShell(<PublicLayout />, { at: '/markets' });

    expect(await screen.findByText('Tet holiday closures')).toBeInTheDocument();
  });
});
