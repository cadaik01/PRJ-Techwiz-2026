// Shared constants. Keep ROLES in step with the role field on the Django user model
// once the SRS names the actual actors.

export const ROLES = Object.freeze({});

export const QUERY_KEYS = Object.freeze({
  ME: ['me'],
  NOTIFICATIONS: ['notifications'],
});

export const STORAGE_KEYS = Object.freeze({
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
});
