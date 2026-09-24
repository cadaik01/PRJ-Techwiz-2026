// Shared constants. Keep ROLES in step with the rows seeded into the backend `roles`
// table (core/policies/roles.py and accounts/migrations/0002_seed_roles.py).

export const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
  FARMER: 'FARMER',
});

export const WS_EVENTS = Object.freeze({
  NEW_NOTIFICATION: 'NEW_NOTIFICATION',
});

export const QUERY_KEYS = Object.freeze({
  ME: ['me'],
  NOTIFICATIONS: ['notifications'],
});

export const STORAGE_KEYS = Object.freeze({
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
});
