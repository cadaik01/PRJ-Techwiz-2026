import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { v4 as uuidv4 } from 'uuid';

import { ApiError } from '@/lib/ApiError';
import { STORAGE_KEYS } from '@/config/constants';
import { env } from '@/config/env';
import { convertMoneyFields, convertMoneyParams } from '@/utils/helpers/currency';
import { useAuthStore } from '@/stores/auth.store';
import type { ApiResponse } from '@/types';

declare module 'axios' {
  export interface AxiosRequestConfig {
    idempotent?: boolean;
    ifMatch?: string;
    _retried?: boolean;
    /** Set after VND→USD so a 401 retry does not convert twice. */
    _moneyPrepared?: boolean;
  }
}

export type AppRequestConfig = AxiosRequestConfig;

type Envelope = ApiResponse<unknown>;

function isEnvelope(body: unknown): body is Envelope {
  return Boolean(body && typeof body === 'object' && 'success' in body && 'data' in body);
}

function readToken(key: string): string | null {
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

function ensureTrailingSlash(url: string): string {
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

function isFormData(data: unknown): boolean {
  return typeof FormData !== 'undefined' && data instanceof FormData;
}

function isBlobLike(data: unknown): boolean {
  return typeof Blob !== 'undefined' && data instanceof Blob;
}

function isParamsRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const axiosClient = axios.create({
  baseURL: env.API_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshing: Promise<string> | null = null;
let waiters: Array<(token: string | null) => void> = [];

async function refreshAccessToken(): Promise<string> {
  const refresh = readToken(STORAGE_KEYS.REFRESH);
  if (!refresh) throw new Error('No refresh token');

  const { data } = await axios.post<Envelope | { access: string; refresh?: string }>(
    `${env.API_URL}/auth/refresh/`,
    { refresh },
  );

  let access: string | undefined;
  let nextRefresh: string | undefined;
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

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readToken(STORAGE_KEYS.ACCESS);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.url) {
    config.url = ensureTrailingSlash(config.url);
  }

  if (!config._moneyPrepared) {
    if (isParamsRecord(config.params)) {
      config.params = convertMoneyParams(config.params);
    }

    const method = (config.method ?? 'get').toLowerCase();
    if (
      (method === 'post' || method === 'put' || method === 'patch') &&
      config.data &&
      !isFormData(config.data) &&
      !isBlobLike(config.data) &&
      typeof config.data === 'object'
    ) {
      config.data = convertMoneyFields(config.data, 'toUsd');
    }
    config._moneyPrepared = true;
  }

  if (config.idempotent) {
    config.headers['Idempotency-Key'] = uuidv4();
  }
  if (config.ifMatch) {
    config.headers['If-Match'] = config.ifMatch;
  }

  return config;
});

function applyMoneyToResponse(response: AxiosResponse): AxiosResponse {
  if (
    response.config.responseType === 'blob' ||
    isBlobLike(response.data) ||
    typeof response.data === 'string'
  ) {
    return response;
  }
  if (response.data !== null && typeof response.data === 'object') {
    response.data = convertMoneyFields(response.data, 'toVnd');
  }
  return response;
}

axiosClient.interceptors.response.use(
  (response) => {
    if (isEnvelope(response.data)) {
      response.data = response.data.data;
    }
    return applyMoneyToResponse(response);
  },
  async (error: AxiosError) => {
    const original = error.config;
    const body = error.response?.data;
    let code: string | undefined;
    let message = error.message;
    let fieldErrors: Record<string, string[]> = {};
    let data: unknown;

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

    const token = await new Promise<string | null>((resolve) => {
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
