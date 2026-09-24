// Shared constants. Keep ROLES in step with the rows seeded into the backend `roles`
// table (core/policies/roles.py and accounts/migrations/0002_seed_roles.py).

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  FARMER: 'FARMER',
});

// Landing page per role after login (Pass 3 §2.2). Roles without an area yet fall back to '/'.
export const ROLE_HOME = Object.freeze({
  ADMIN: '/admin',
});

export const homeFor = (user) => ROLE_HOME[user?.role] ?? '/';

export const WS_EVENTS = Object.freeze({
  NEW_NOTIFICATION: 'NEW_NOTIFICATION',
});

export const QUERY_KEYS = Object.freeze({
  ME: ['me'],
  NOTIFICATIONS: ['notifications'],
  ADMIN_CATEGORIES: ['admin', 'categories'],
});

export const STORAGE_KEYS = Object.freeze({
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
});
