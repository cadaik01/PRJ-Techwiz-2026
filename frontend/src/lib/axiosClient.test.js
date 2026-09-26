import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { STORAGE_KEYS } from '@/config/constants';

/**
 * P3 interceptor contract (Pass 4B §1.2, D-021). The backend rotates refresh tokens and a
 * rotated one is dead on reuse, so a single refresh must serve every request that got a 401.
 */
let axiosClient;
let mock;
let refreshMock; // refreshAccessToken() posts through the bare axios instance, not axiosClient

beforeEach(async () => {
  vi.resetModules();
  ({ axiosClient } = await import('@/lib/axiosClient'));
  mock = new MockAdapter(axiosClient);
  refreshMock = new MockAdapter(axios);
});

afterEach(() => {
  mock.restore();
  refreshMock.restore();
});

describe('request headers', () => {
  it('sends the access token from storage', async () => {
    localStorage.setItem(STORAGE_KEYS.ACCESS, 'token-1');
    mock.onGet('/auth/me/').reply(200, { success: true, message: 'OK', data: { id: 1 }, errors: {} });

    await axiosClient.get('/auth/me/');

    expect(mock.history.get[0].headers.Authorization).toBe('Bearer token-1');
  });

  it('adds a unique Idempotency-Key only when the caller asks for one', async () => {
    mock.onPost('/customer/orders/').reply(201, { success: true, message: 'OK', data: {}, errors: {} });

    await axiosClient.post('/customer/orders/', {}, { idempotent: true });
    await axiosClient.post('/customer/orders/', {}, { idempotent: true });
    await axiosClient.post('/customer/orders/', {});

    const [first, second, third] = mock.history.post;
    expect(first.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.headers['Idempotency-Key']).not.toBe(first.headers['Idempotency-Key']);
    expect(third.headers['Idempotency-Key']).toBeUndefined();
  });

  it('keeps one Idempotency-Key across a retry, so a replay is not a second order', async () => {
    // CU-04 creates N orders. If the access token dies mid-flight, the retry must carry the same
    // key, or the server treats it as a fresh checkout and the customer pays for two of everything.
    localStorage.setItem(STORAGE_KEYS.ACCESS, 'stale');
    localStorage.setItem(STORAGE_KEYS.REFRESH, 'refresh-1');
    refreshMock.onPost(/\/auth\/refresh\/$/).reply(200, {
      success: true, message: 'OK', data: { access: 'fresh', refresh: 'refresh-2' }, errors: {},
    });
    mock.onPost('/customer/orders/').reply((config) => (
      config.headers.Authorization === 'Bearer fresh'
        ? [201, { success: true, message: 'OK', data: { orders: [] }, errors: {} }]
        : [401, { success: false, message: 'Expired', data: {}, errors: {}, code: 'TOKEN_EXPIRED' }]
    ));

    await axiosClient.post('/customer/orders/', { groups: [] }, { idempotent: true });

    expect(mock.history.post).toHaveLength(2);
    const [first, retry] = mock.history.post;
    expect(first.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(retry.headers['Idempotency-Key']).toBe(first.headers['Idempotency-Key']);
  });

  it('adds If-Match for optimistic concurrency', async () => {
    mock.onPatch('/customer/orders/7/').reply(200, { success: true, message: 'OK', data: {}, errors: {} });

    await axiosClient.patch('/customer/orders/7/', {}, { ifMatch: '3' });

    expect(mock.history.patch[0].headers['If-Match']).toBe('3');
  });

  it('appends the trailing slash Django expects', async () => {
    mock.onGet('/customer/orders/').reply(200, { success: true, message: 'OK', data: [], errors: {} });

    await axiosClient.get('/customer/orders');

    expect(mock.history.get[0].url).toBe('/customer/orders/');
  });
});

describe('response envelope', () => {
  it('unwraps data so callers never see the envelope', async () => {
    mock.onGet('/auth/me/').reply(200, {
      success: true, message: 'OK', data: { id: 9, role: 'CUSTOMER' }, errors: {},
    });

    const response = await axiosClient.get('/auth/me/');

    expect(response.data).toEqual({ id: 9, role: 'CUSTOMER' });
  });

  it('turns a failure envelope into an ApiError carrying code and field errors', async () => {
    mock.onPost('/customer/orders/').reply(400, {
      success: false, message: 'Some products do not have enough stock', code: 'INSUFFICIENT_STOCK',
      data: { available: { 12: 2 } }, errors: { 'groups.0.items.0.quantity': ['Only 2 KG left'] },
    });

    const error = await axiosClient.post('/customer/orders/', {}).catch((caught) => caught);

    expect(error.code).toBe('INSUFFICIENT_STOCK');
    expect(error.status).toBe(400);
    expect(error.fieldErrors['groups.0.items.0.quantity']).toEqual(['Only 2 KG left']);
    expect(error.data).toEqual({ available: { 12: 2 } });
  });
});

describe('refresh on 401', () => {
  beforeEach(() => {
    localStorage.setItem(STORAGE_KEYS.ACCESS, 'stale');
    localStorage.setItem(STORAGE_KEYS.REFRESH, 'refresh-1');
  });

  it('refreshes once, then replays the request with the new token', async () => {
    let calls = 0;
    mock.onGet('/auth/me/').reply(() => {
      calls += 1;
      return calls === 1 ? [401, { success: false, message: 'expired', code: 'NOT_AUTHENTICATED', data: {}, errors: {} }]
        : [200, { success: true, message: 'OK', data: { id: 1 }, errors: {} }];
    });
    refreshMock.onPost(/\/auth\/refresh\//).reply(200, {
      success: true, message: 'OK', data: { access: 'fresh', refresh: 'refresh-2' }, errors: {},
    });

    const response = await axiosClient.get('/auth/me/');

    expect(response.data).toEqual({ id: 1 });
    expect(mock.history.get[1].headers.Authorization).toBe('Bearer fresh');
  });

  it('refreshes only once for several requests that fail together', async () => {
    // The rotated refresh token is single-use, so a second refresh would kill the session.
    let refreshCalls = 0;
    mock.onGet(/\/customer\//).reply((config) =>
      config.headers.Authorization === 'Bearer fresh'
        ? [200, { success: true, message: 'OK', data: {}, errors: {} }]
        : [401, { success: false, message: 'expired', code: 'NOT_AUTHENTICATED', data: {}, errors: {} }],
    );
    refreshMock.onPost(/\/auth\/refresh\//).reply(() => {
      refreshCalls += 1;
      return [200, { success: true, message: 'OK', data: { access: 'fresh' }, errors: {} }];
    });

    await Promise.all([
      axiosClient.get('/customer/orders/'),
      axiosClient.get('/customer/profile/'),
      axiosClient.get('/customer/dashboard/'),
    ]);

    expect(refreshCalls).toBe(1);
  });

  it('gives up and clears the session when the refresh token is dead', async () => {
    const lost = vi.fn();
    window.addEventListener('auth:session-lost', lost);
    mock.onGet('/auth/me/').reply(401, { success: false, message: 'expired', code: 'NOT_AUTHENTICATED', data: {}, errors: {} });
    refreshMock.onPost(/\/auth\/refresh\//).reply(401, {
      success: false, message: 'Token is invalid', code: 'TOKEN_INVALID', data: {}, errors: {},
    });

    const error = await axiosClient.get('/auth/me/').catch((caught) => caught);

    expect(error.status).toBe(401);
    expect(localStorage.getItem(STORAGE_KEYS.ACCESS)).toBeNull();
    expect(lost).toHaveBeenCalled();
    window.removeEventListener('auth:session-lost', lost);
  });

  it('does not try to refresh when the server already says the token is invalid', async () => {
    let refreshCalls = 0;
    refreshMock.onPost(/\/auth\/refresh\//).reply(() => {
      refreshCalls += 1;
      return [200, {}];
    });
    mock.onGet('/auth/me/').reply(401, {
      success: false, message: 'Token is invalid', code: 'TOKEN_INVALID', data: {}, errors: {},
    });

    const error = await axiosClient.get('/auth/me/').catch((caught) => caught);

    expect([error.code, refreshCalls]).toEqual(['TOKEN_INVALID', 0]);
    expect(localStorage.getItem(STORAGE_KEYS.REFRESH)).toBeNull();
  });
});
