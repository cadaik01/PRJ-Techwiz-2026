import { http, HttpResponse } from 'msw';
import { envelope, errorEnvelope, findDemoByEmail, getDemoUserByAccess, getUserByAccess, issueTokens, publicConfig, refreshTokens, registerCustomerUser, registerFarmerUser, revokeAccess, revokeRefresh, toBeMe, updatePassword } from '@/mocks/data';
import { catalogHandlers } from '@/mocks/catalogHandlers';
import { customerHandlers } from '@/mocks/customerHandlers';
import { farmerHandlers } from '@/mocks/farmerHandlers';
import { adminHandlers } from '@/mocks/adminHandlers';
function authHeader(request) {
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
        const body = (await request.json());
        const email = (body.email ?? '').toLowerCase();
        const user = findDemoByEmail(email);
        if (!user || user.password !== body.password) {
            return HttpResponse.json(errorEnvelope('Invalid email or password', 'INVALID_CREDENTIALS'), { status: 401 });
        }
        if (user.role === 'ADMIN') {
            return HttpResponse.json(errorEnvelope('Invalid email or password', 'INVALID_CREDENTIALS'), { status: 401 });
        }
        const session = issueTokens(user.email);
        if (!session) {
            return HttpResponse.json(errorEnvelope('Could not create session', 'INTERNAL_SERVER_ERROR'), { status: 500 });
        }
        return HttpResponse.json(envelope({
            access: session.access,
            refresh: session.refresh,
            user: session.user,
        }));
    }),
    http.post('/api/auth/admin/login/', async ({ request }) => {
        const body = (await request.json());
        const email = (body.email ?? '').toLowerCase();
        const user = findDemoByEmail(email);
        if (!user || user.password !== body.password || user.role !== 'ADMIN') {
            return HttpResponse.json(errorEnvelope('Invalid email or password', 'INVALID_CREDENTIALS'), { status: 401 });
        }
        const session = issueTokens(user.email);
        if (!session) {
            return HttpResponse.json(errorEnvelope('Could not create session', 'INTERNAL_SERVER_ERROR'), { status: 500 });
        }
        return HttpResponse.json(envelope({
            access: session.access,
            refresh: session.refresh,
            user: session.user,
        }));
    }),
    http.post('/api/auth/refresh/', async ({ request }) => {
        const body = (await request.json());
        const result = body.refresh ? refreshTokens(body.refresh) : null;
        if (!result) {
            return HttpResponse.json(errorEnvelope('Session expired', 'TOKEN_INVALID'), { status: 401 });
        }
        return HttpResponse.json(envelope(result));
    }),
    http.post('/api/auth/logout/', async ({ request }) => {
        const body = (await request.json());
        if (body.access)
            revokeAccess(body.access);
        if (body.refresh)
            revokeRefresh(body.refresh);
        return HttpResponse.json(envelope(null, 'Signed out.'));
    }),
    http.get('/api/auth/me/', ({ request }) => {
        const demo = getDemoUserByAccess(authHeader(request));
        if (!demo) {
            return HttpResponse.json(errorEnvelope('Session expired', 'TOKEN_INVALID'), { status: 401 });
        }
        return HttpResponse.json(envelope(toBeMe(demo)));
    }),
    http.post('/api/auth/change-password/', async ({ request }) => {
        const user = getUserByAccess(authHeader(request));
        if (!user) {
            return HttpResponse.json(errorEnvelope('Session expired', 'TOKEN_INVALID'), { status: 401 });
        }
        const body = (await request.json());
        const result = updatePassword(user.id, body.current_password ?? '', body.new_password ?? '');
        if ('error' in result) {
            return HttpResponse.json(errorEnvelope('Current password is incorrect', 'VALIDATION_ERROR', {
                current_password: ['Current password is incorrect'],
            }), { status: 400 });
        }
        return HttpResponse.json(envelope({}));
    }),
    http.post('/api/auth/ws-ticket/', ({ request }) => {
        const user = getUserByAccess(authHeader(request));
        if (!user) {
            return HttpResponse.json(errorEnvelope('Session expired', 'TOKEN_INVALID'), { status: 401 });
        }
        return HttpResponse.json(envelope({
            ticket: `ticket-${user.id}-${crypto.randomUUID()}`,
            expires_in: 30,
        }));
    }),
    http.post('/api/auth/register/customer/', async ({ request }) => {
        const body = (await request.json());
        const result = registerCustomerUser(body);
        if ('error' in result) {
            return HttpResponse.json(errorEnvelope('Email already registered', 'EMAIL_EXISTS'), {
                status: 400,
            });
        }
        return HttpResponse.json(envelope(result.tokens), { status: 201 });
    }),
    http.post('/api/auth/register/farmer/', async ({ request }) => {
        const body = (await request.json());
        const result = registerFarmerUser(body);
        if ('error' in result) {
            return HttpResponse.json(errorEnvelope('Email already registered', 'EMAIL_EXISTS'), {
                status: 400,
            });
        }
        return HttpResponse.json(envelope(result.tokens), { status: 201 });
    }),
    http.post('/api/chat/messages/', async ({ request }) => {
        const body = (await request.json());
        const last = body.messages?.[body.messages.length - 1]?.content ?? '';
        return HttpResponse.json(envelope({
            reply: `MarketLink AI: received your question “${last.slice(0, 80)}”. (mock)`,
            tools_used: ['search_markets'],
        }));
    }),
    http.get('/api/health/', () => {
        return HttpResponse.json(envelope({ status: 'ok' }));
    }),
];
