import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { ApiError } from '@/lib/ApiError';
import { STORAGE_KEYS } from '@/config/constants';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth.store';

function isEnvelope(body) {
  return Boolean(body && typeof body === 'object' && 'success' in body && 'data' in body);
}

function readToken(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function onSessionLost() {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS);
    localStorage.removeItem(STORAGE_KEYS.REFRESH);
  } catch {
    // Storage unavailable.
  }
  window.dispatchEvent(new CustomEvent('auth:session-lost'));
}

function ensureTrailingSlash(url) {
  const [path, query] = url.split('?');
  if (!path || path.endsWith('/')) return url;
  const withSlash = `${path}/`;
  if (import.meta.env.DEV) {
    console.warn(
      `[axios] API path missing trailing slash: "${url}" → "${withSlash}${query ? `?${query}` : ''}"`,
    );
  }
  return query ? `${withSlash}?${query}` : withSlash;
}

const axiosClient = axios.create({
  baseURL: env.API_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshing = null;
let waiters = [];

async function refreshAccessToken() {
  const refresh = readToken(STORAGE_KEYS.REFRESH);
  if (!refresh) throw new Error('No refresh token');

  const { data } = await axios.post(`${env.API_URL}/auth/refresh/`, { refresh });

  let access;
  let nextRefresh;
  if (isEnvelope(data) && data.data && typeof data.data === 'object') {
    const payload = data.data;
    if ('access' in payload && typeof payload.access === 'string') {
      access = payload.access;
    }
    if ('refresh' in payload && typeof payload.refresh === 'string') {
      nextRefresh = payload.refresh;
    }
  } else if (data && typeof data === 'object' && 'access' in data) {
    if (typeof data.access === 'string') access = data.access;
    if ('refresh' in data && typeof data.refresh === 'string') {
      nextRefresh = data.refresh;
    }
  }
  if (!access) throw new Error('Refresh response missing access token');

  if (nextRefresh) {
    useAuthStore.getState().setTokens({ access, refresh: nextRefresh });
  } else {
    useAuthStore.getState().setAccessToken(access);
  }
  return access;
}

axiosClient.interceptors.request.use((config) => {
  const token = readToken(STORAGE_KEYS.ACCESS);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.url) {
    config.url = ensureTrailingSlash(config.url);
  }

  if (config.idempotent) {
    config.headers['Idempotency-Key'] = uuidv4();
  }
  if (config.ifMatch) {
    config.headers['If-Match'] = config.ifMatch;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    if (isEnvelope(response.data)) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const original = error.config;
    const body = error.response?.data;
    let code;
    let message = error.message;
    let fieldErrors = {};
    let data;

    if (isEnvelope(body)) {
      message = body.message || message;
      fieldErrors = body.errors ?? {};
      code = body.code;
      data = body.data;
      if (!code && fieldErrors.code?.[0]) {
        code = fieldErrors.code[0];
      }
    }

    if (code === 'TOKEN_INVALID' || code === 'ACCOUNT_LOCKED') {
      onSessionLost();
      return Promise.reject(
        new ApiError({
          status: error.response?.status ?? 401,
          message,
          code,
          fieldErrors,
          data,
        }),
      );
    }

    const status = error.response?.status ?? 0;

    if (status === 403 && !code) {
      code = 'FORBIDDEN';
    }
    if (status >= 500 && !code) {
      code = 'SERVER_ERROR';
    }

    if (status !== 401 || !original || original._retried) {
      return Promise.reject(
        new ApiError({
          status,
          message,
          code,
          fieldErrors,
          data,
        }),
      );
    }

    original._retried = true;

    if (!refreshing) {
      refreshing = refreshAccessToken()
        .then((token) => {
          waiters.forEach((resolve) => resolve(token));
          return token;
        })
        .catch((err) => {
          waiters.forEach((resolve) => resolve(null));
          onSessionLost();
          throw err;
        })
        .finally(() => {
          waiters = [];
          refreshing = null;
        });
    }

    const token = await new Promise((resolve) => {
      waiters.push(resolve);
      refreshing?.catch(() => {});
    });

    if (!token) {
      return Promise.reject(
        new ApiError({
          status: 401,
          message,
          code: code ?? 'TOKEN_INVALID',
          fieldErrors,
          data,
        }),
      );
    }

    original.headers.Authorization = `Bearer ${token}`;
    return axiosClient(original);
  },
);

export { axiosClient };
export default axiosClient;
