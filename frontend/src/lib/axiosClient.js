import axios from 'axios';

import { env } from '../config/env';
import { STORAGE_KEYS } from '../config/constants';

// Axios instance with envelope unwrapping and a single-flight refresh queue.
//
// Every endpoint answers with {success, message, data, errors}. The response
// interceptor strips that wrapper so callers get the payload directly, and the
// error interceptor lifts `errors` onto the rejection as `fieldErrors`.
//
// On 401, only the first request triggers a refresh; the rest park in `waiters`
// and replay once it resolves. Without this the app fires one refresh per
// in-flight request, and with rotation enabled all but one of those refresh
// tokens is already burnt by the time it arrives.

const axiosClient = axios.create({
  baseURL: env.API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshing = null;
let waiters = [];

function readToken(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function isEnvelope(body) {
  return Boolean(body) && typeof body === 'object' && 'success' in body && 'data' in body;
}

function onSessionLost() {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACCESS);
    localStorage.removeItem(STORAGE_KEYS.REFRESH);
  } catch {
    // Private mode or blocked storage: nothing to clear.
  }
  window.dispatchEvent(new CustomEvent('auth:session-lost'));
}

async function refreshAccessToken() {
  const refresh = readToken(STORAGE_KEYS.REFRESH);
  if (!refresh) throw new Error('No refresh token');

  // Bare axios, not axiosClient: the interceptors below must not recurse, which
  // also means this response still carries the envelope.
  const { data } = await axios.post(`${env.API_BASE_URL}/auth/refresh/`, { refresh });
  const access = isEnvelope(data) ? data.data.access : data.access;
  localStorage.setItem(STORAGE_KEYS.ACCESS, access);
  return access;
}

axiosClient.interceptors.request.use((config) => {
  const token = readToken(STORAGE_KEYS.ACCESS);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    if (isEnvelope(response.data)) {
      response.envelope = response.data;
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const body = error.response?.data;
    if (isEnvelope(body)) {
      error.fieldErrors = body.errors ?? {};
      error.apiMessage = body.message ?? '';
    }

    const original = error.config;
    if (error.response?.status !== 401 || original?._retried) {
      return Promise.reject(error);
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
      refreshing.catch(() => {});
    });

    if (!token) return Promise.reject(error);
    original.headers.Authorization = `Bearer ${token}`;
    return axiosClient(original);
  },
);

export default axiosClient;
