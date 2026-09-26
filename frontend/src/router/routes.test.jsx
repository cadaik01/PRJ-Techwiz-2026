import { describe, expect, it } from 'vitest';
import { adminAuthRoutes } from '@/router/routes/adminAuth.routes';
import { authRoutes } from '@/router/routes/auth.routes';
import { customerRoutes } from '@/router/routes/customer.routes';
import { publicRoutes } from '@/router/routes/public.routes';
import { DASHBOARD_PATH } from '@/config/constants';

/** Pass 3 route table. Backend `target_url` values point at these paths, so they cannot drift. */
const CUSTOMER_SCREENS = {
  'C-00': '/customer',
  'C-01': '/customer/cart',
  'C-02': '/customer/checkout',
  'C-03': '/customer/checkout/success',
  'C-04': '/customer/orders',
  'C-05': '/customer/orders/:id',
  'C-06': '/customer/orders/:id/edit',
  'C-07': '/customer/orders/:id/review',
  'C-08': '/customer/favorites',
  'C-09': '/customer/notifications',
  'C-10': '/customer/profile',
  'C-11': '/customer/password',
};

function pathsOf(routes) {
  const found = [];
  const walk = (list) => {
    for (const route of list) {
      if (route.path) found.push(route.path);
      if (route.children) walk(route.children);
    }
  };
  walk(routes);
  return found;
}

describe('customer routes follow the Pass 3 table', () => {
  it.each(Object.entries(CUSTOMER_SCREENS))('%s is served at %s', (_code, path) => {
    expect(pathsOf(customerRoutes)).toContain(path);
  });

  it('defines nothing beyond the table', () => {
    expect(pathsOf(customerRoutes).sort()).toEqual(Object.values(CUSTOMER_SCREENS).sort());
  });

  it('keeps no /app prefix from the mockup', () => {
    expect(pathsOf(customerRoutes).filter((path) => path.startsWith('/app'))).toEqual([]);
  });

  it('nests the customer screens inside the storefront shell', () => {
    // C-00 → C-11 keep the public header, so the cart and the bell stay reachable.
    expect(pathsOf(publicRoutes)).toEqual(expect.arrayContaining(['/', '/customer']));
  });
});

describe('auth routes', () => {
  it('serves G-09, G-10 and G-11', () => {
    expect(pathsOf(authRoutes).sort()).toEqual(['/login', '/register', '/register/farmer']);
  });

  it('serves A-00 on its own portal (D-027)', () => {
    expect(pathsOf(adminAuthRoutes)).toEqual(['/admin/login']);
  });

  it('keeps the two sign-in pages apart', () => {
    expect(pathsOf(authRoutes)).not.toContain('/admin/login');
  });
});

describe('where each role lands', () => {
  it('matches a route that exists', () => {
    expect(pathsOf(customerRoutes)).toContain(DASHBOARD_PATH.CUSTOMER);
    expect([DASHBOARD_PATH.FARMER, DASHBOARD_PATH.ADMIN]).toEqual(['/farmer', '/admin']);
  });
});
