import { http, HttpResponse } from 'msw';

import {
  envelope,
  errorEnvelope,
  findDemoByEmail,
  getDemoUserByAccess,
  getUserByAccess,
  issueTokens,
  publicConfig,
  refreshTokens,
  registerCustomerUser,
  registerFarmerUser,
  revokeAccess,
  revokeRefresh,
  toBeMe,
  updatePassword,
} from '@/mocks/data';
import { catalogHandlers } from '@/mocks/catalogHandlers';
import { customerHandlers } from '@/mocks/customerHandlers';
import { farmerHandlers } from '@/mocks/farmerHandlers';
import { adminHandlers } from '@/mocks/adminHandlers';

function authHeader(request: Request) {
  return request.headers.get('Authorization');
}

export const handlers = [
  ...catalogHandlers,
  ...customerHandlers,
  ...farmerHandlers,
  ...adminHandlers,

  http.get('/api/config/', () => {
    return HttpResponse.json(envelope(publicConfig));
  }),

  http.post('/api/auth/login/', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email ?? '').toLowerCase();
    const user = findDemoByEmail(email);
    if (!user || user.password !== body.password) {
      return HttpResponse.json(
        errorEnvelope('Email hoặc mật khẩu không đúng', 'INVALID_CREDENTIALS'),
        { status: 401 },
      );
    }
    if (user.role === 'ADMIN') {
      return HttpResponse.json(
        errorEnvelope('Email hoặc mật khẩu không đúng', 'INVALID_CREDENTIALS'),
        { status: 401 },
      );
    }
    const session = issueTokens(user.email);
    if (!session) {
      return HttpResponse.json(
        errorEnvelope('Không tạo được phiên', 'INTERNAL_SERVER_ERROR'),
        { status: 500 },
      );
    }
    return HttpResponse.json(
      envelope({
        access: session.access,
        refresh: session.refresh,
        user: session.user,
      }),
    );
  }),

  http.post('/api/auth/admin/login/', async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = (body.email ?? '').toLowerCase();
    const user = findDemoByEmail(email);
    if (!user || user.password !== body.password || user.role !== 'ADMIN') {
      return HttpResponse.json(
        errorEnvelope('Email hoặc mật khẩu không đúng', 'INVALID_CREDENTIALS'),
        { status: 401 },
      );
    }
    const session = issueTokens(user.email);
    if (!session) {
      return HttpResponse.json(
        errorEnvelope('Không tạo được phiên', 'INTERNAL_SERVER_ERROR'),
        { status: 500 },
      );
    }
    return HttpResponse.json(
      envelope({
        access: session.access,
        refresh: session.refresh,
        user: session.user,
      }),
    );
  }),

  http.post('/api/auth/refresh/', async ({ request }) => {
    const body = (await request.json()) as { refresh?: string };
    const result = body.refresh ? refreshTokens(body.refresh) : null;
    if (!result) {
      return HttpResponse.json(
        errorEnvelope('Phiên đăng nhập hết hạn', 'TOKEN_INVALID'),
        { status: 401 },
      );
    }
    return HttpResponse.json(envelope(result));
  }),

  http.post('/api/auth/logout/', async ({ request }) => {
    const body = (await request.json()) as { access?: string; refresh?: string };
    if (body.access) revokeAccess(body.access);
    if (body.refresh) revokeRefresh(body.refresh);
    return HttpResponse.json(envelope(null, 'Signed out.'));
  }),

  http.get('/api/auth/me/', ({ request }) => {
    const demo = getDemoUserByAccess(authHeader(request));
    if (!demo) {
      return HttpResponse.json(
        errorEnvelope('Phiên đăng nhập hết hạn', 'TOKEN_INVALID'),
        { status: 401 },
      );
    }
    return HttpResponse.json(envelope(toBeMe(demo)));
  }),

  http.post('/api/auth/change-password/', async ({ request }) => {
    const user = getUserByAccess(authHeader(request));
    if (!user) {
      return HttpResponse.json(
        errorEnvelope('Phiên đăng nhập hết hạn', 'TOKEN_INVALID'),
        { status: 401 },
      );
    }
    const body = (await request.json()) as {
      current_password?: string;
      new_password?: string;
      confirm_password?: string;
    };
    const result = updatePassword(
      user.id,
      body.current_password ?? '',
      body.new_password ?? '',
    );
    if ('error' in result) {
      return HttpResponse.json(
        errorEnvelope('Mật khẩu hiện tại không đúng', 'VALIDATION_ERROR', {
          current_password: ['Current password is incorrect'],
        }),
        { status: 400 },
      );
    }
    return HttpResponse.json(envelope({}));
  }),

  http.post('/api/auth/ws-ticket/', ({ request }) => {
    const user = getUserByAccess(authHeader(request));
    if (!user) {
      return HttpResponse.json(
        errorEnvelope('Phiên đăng nhập hết hạn', 'TOKEN_INVALID'),
        { status: 401 },
      );
    }
    return HttpResponse.json(
      envelope({
        ticket: `ticket-${user.id}-${crypto.randomUUID()}`,
        expires_in: 30,
      }),
    );
  }),

  http.post('/api/auth/register/customer/', async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      password: string;
      confirm_password: string;
      full_name: string;
      phone: string;
      address: string;
    };
    const result = registerCustomerUser(body);
    if ('error' in result) {
      return HttpResponse.json(errorEnvelope('Email đã được đăng ký', 'EMAIL_EXISTS'), {
        status: 400,
      });
    }
    return HttpResponse.json(envelope(result.tokens), { status: 201 });
  }),

  http.post('/api/auth/register/farmer/', async ({ request }) => {
    const body = (await request.json()) as {
      email: string;
      password: string;
      confirm_password: string;
      stall_name: string;
      contact_person: string;
      phone: string;
      address: string;
    };
    const result = registerFarmerUser(body);
    if ('error' in result) {
      return HttpResponse.json(errorEnvelope('Email đã được đăng ký', 'EMAIL_EXISTS'), {
        status: 400,
      });
    }
    return HttpResponse.json(envelope(result.tokens), { status: 201 });
  }),

  http.post('/api/chat/messages/', async ({ request }) => {
    const body = (await request.json()) as {
      messages?: Array<{ role: string; content: string }>;
    };
    const last = body.messages?.[body.messages.length - 1]?.content ?? '';
    return HttpResponse.json(
      envelope({
        reply: `MarketLink AI: mình đã nhận câu hỏi “${last.slice(0, 80)}”. (mock)`,
        tools_used: ['search_markets'],
      }),
    );
  }),

  http.get('/api/health/', () => {
    return HttpResponse.json(envelope({ status: 'ok' }));
  }),
];
