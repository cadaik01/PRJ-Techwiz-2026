import { http, HttpResponse } from 'msw';

import {
  adminAnnouncements,
  adminCategories,
  adminCustomers,
  adminFarmers,
  adminMarkets,
  auditLogs,
  moderationProducts,
  moderationReviews,
  pushAudit,
  pushFarmerHistory,
  setAdminAnnouncements,
  setAdminCategories,
  setAdminCustomers,
  setAdminFarmers,
  setAdminMarkets,
  setModerationProducts,
  setModerationReviews,
  toFarmerDetail,
  toFarmerSummary,
} from '@/mocks/adminData';
import { envelope, errorEnvelope, getUserByAccess, paginate } from '@/mocks/data';
import { customerOrders } from '@/mocks/orders';
import type { AdminMarketPayload, FarmerStatus, OrderStatus } from '@/types';
import { moneyToNumber } from '@/types';

function authAdmin(request: Request) {
  const user = getUserByAccess(request.headers.get('Authorization'));
  if (!user || user.role !== 'ADMIN') return null;
  return user;
}

function dayKey(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export const adminHandlers = [
  http.get('/api/admin/dashboard/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const today = dayKey(0);
    const orders_last_30_days = Array.from({ length: 30 }, (_, i) => {
      const date = dayKey(i - 29);
      const count = customerOrders.filter(
        (o) => o.created_at.slice(0, 10) === date,
      ).length;
      return { date, count: count || (i % 5 === 0 ? 3 : i % 3) };
    });
    const statusMap = new Map<OrderStatus, number>();
    for (const o of customerOrders) {
      statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
    }
    return HttpResponse.json(
      envelope({
        farmer_count: adminFarmers.length,
        pending_farmer_count: adminFarmers.filter((f) => f.status === 'PENDING').length,
        customer_count: adminCustomers.length,
        active_market_count: adminMarkets.filter((m) => m.is_active).length,
        order_count_today:
          customerOrders.filter((o) => o.created_at.slice(0, 10) === today).length || 4,
        orders_last_30_days,
        orders_by_status: [...statusMap.entries()].map(([status, count]) => ({
          status,
          count,
        })),
        pending_farmers: adminFarmers
          .filter((f) => f.status === 'PENDING')
          .map(toFarmerSummary),
      }),
    );
  }),

  http.get('/api/admin/farmers/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const status = url.searchParams.get('status') as FarmerStatus | null;
    const page = Number(url.searchParams.get('page') ?? 1);
    const page_size = Number(url.searchParams.get('page_size') ?? 10);
    let list = [...adminFarmers];
    if (status) list = list.filter((f) => f.status === status);
    if (q) {
      list = list.filter(
        (f) =>
          f.stall_name.toLowerCase().includes(q) ||
          f.contact_person.toLowerCase().includes(q) ||
          f.email.toLowerCase().includes(q),
      );
    }
    return HttpResponse.json(
      envelope(paginate(list.map(toFarmerSummary), page, page_size)),
    );
  }),

  http.get('/api/admin/farmers/:id/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const farmer = adminFarmers.find((f) => f.id === Number(params.id));
    if (!farmer) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    return HttpResponse.json(envelope(toFarmerDetail(farmer)));
  }),

  http.get('/api/admin/farmers/:id/suspension-impact/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const farmer = adminFarmers.find((f) => f.id === Number(params.id));
    if (!farmer) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const open = customerOrders.filter(
      (o) =>
        o.farmer.id === farmer.id &&
        (o.status === 'PLACED' ||
          o.status === 'ACCEPTED' ||
          o.status === 'READY_FOR_PICKUP'),
    );
    const customers = new Set(open.map((o) => o.id));
    return HttpResponse.json(
      envelope({
        open_order_count: open.length || farmer.open_order_count,
        affected_customer_count: customers.size || farmer.open_order_count,
      }),
    );
  }),

  http.post('/api/admin/farmers/:id/approve/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminFarmers.findIndex((f) => f.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const next = pushFarmerHistory(adminFarmers[idx], 'APPROVED', null);
    const copy = [...adminFarmers];
    copy[idx] = next;
    setAdminFarmers(copy);
    pushAudit({
      action: 'FARMER_APPROVE',
      user: { id: 3, email: 'admin@demo.vn' },
      endpoint: null,
      method: 'POST',
      ip_address: '127.0.0.1',
      user_agent: 'msw',
      status_code: 200,
      request_id: null,
      details: { stall_name: next.stall_name },
    });
    return HttpResponse.json(envelope(toFarmerSummary(next), 'Farmer approved'));
  }),

  http.post('/api/admin/farmers/:id/reject/', async ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminFarmers.findIndex((f) => f.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim() ?? '';
    if (reason.length < 5) {
      return HttpResponse.json(
        errorEnvelope('Reason must be at least 5 characters', 'VALIDATION_ERROR'),
        { status: 400 },
      );
    }
    const next = pushFarmerHistory(adminFarmers[idx], 'REJECTED', reason);
    const copy = [...adminFarmers];
    copy[idx] = next;
    setAdminFarmers(copy);
    pushAudit({
      action: 'FARMER_REJECT',
      user: { id: 3, email: 'admin@demo.vn' },
      endpoint: null,
      method: 'POST',
      ip_address: '127.0.0.1',
      user_agent: 'msw',
      status_code: 200,
      request_id: null,
      details: { reason },
    });
    return HttpResponse.json(envelope(toFarmerSummary(next), 'Rejected'));
  }),

  http.post('/api/admin/farmers/:id/suspend/', async ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminFarmers.findIndex((f) => f.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim() ?? '';
    if (reason.length < 5) {
      return HttpResponse.json(
        errorEnvelope('Reason must be at least 5 characters', 'VALIDATION_ERROR'),
        { status: 400 },
      );
    }
    const next = pushFarmerHistory(adminFarmers[idx], 'SUSPENDED', reason);
    const copy = [...adminFarmers];
    copy[idx] = next;
    setAdminFarmers(copy);
    pushAudit({
      action: 'FARMER_SUSPEND',
      user: { id: 3, email: 'admin@demo.vn' },
      endpoint: null,
      method: 'POST',
      ip_address: '127.0.0.1',
      user_agent: 'msw',
      status_code: 200,
      request_id: null,
      details: { reason },
    });
    return HttpResponse.json(envelope(toFarmerSummary(next), 'Suspended'));
  }),

  http.post('/api/admin/farmers/:id/reinstate/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminFarmers.findIndex((f) => f.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const next = pushFarmerHistory(adminFarmers[idx], 'APPROVED', 'Restore');
    const copy = [...adminFarmers];
    copy[idx] = next;
    setAdminFarmers(copy);
    pushAudit({
      action: 'FARMER_REINSTATE',
      user: { id: 3, email: 'admin@demo.vn' },
      endpoint: null,
      method: 'POST',
      ip_address: '127.0.0.1',
      user_agent: 'msw',
      status_code: 200,
      request_id: null,
      details: {},
    });
    return HttpResponse.json(envelope(toFarmerSummary(next), 'Restored'));
  }),

  http.get('/api/admin/customers/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const page = Number(url.searchParams.get('page') ?? 1);
    const page_size = Number(url.searchParams.get('page_size') ?? 10);
    let list = [...adminCustomers];
    if (q) {
      list = list.filter(
        (c) => c.email.toLowerCase().includes(q) || c.full_name.toLowerCase().includes(q),
      );
    }
    return HttpResponse.json(envelope(paginate(list, page, page_size)));
  }),

  http.get('/api/admin/customers/:id/deactivation-impact/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const customer = adminCustomers.find((c) => c.id === Number(params.id));
    if (!customer) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    return HttpResponse.json(
      envelope({
        open_orders: {
          PLACED: customer.is_active ? 1 : 0,
          ACCEPTED: customer.is_active ? 1 : 0,
          READY_FOR_PICKUP: 0,
          total: customer.is_active ? 2 : 0,
        },
        affected_farmers: customer.is_active ? 1 : 0,
      }),
    );
  }),

  http.post('/api/admin/customers/:id/deactivate/', async ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminCustomers.findIndex((c) => c.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const body = (await request.json()) as { reason?: string };
    const next = { ...adminCustomers[idx], is_active: false };
    const copy = [...adminCustomers];
    copy[idx] = next;
    setAdminCustomers(copy);
    const affected_orders = Math.min(2, next.total_orders);
    pushAudit({
      action: 'CUSTOMER_DEACTIVATED',
      user: { id: 3, email: 'admin@demo.vn' },
      endpoint: null,
      method: 'POST',
      ip_address: '127.0.0.1',
      user_agent: 'msw',
      status_code: 200,
      request_id: null,
      details: { reason: body.reason ?? null },
    });
    return HttpResponse.json(
      envelope({ ...next, affected_orders }, 'Account deactivated'),
    );
  }),

  http.post('/api/admin/customers/:id/activate/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminCustomers.findIndex((c) => c.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const next = { ...adminCustomers[idx], is_active: true };
    const copy = [...adminCustomers];
    copy[idx] = next;
    setAdminCustomers(copy);
    pushAudit({
      action: 'CUSTOMER_ACTIVATED',
      user: { id: 3, email: 'admin@demo.vn' },
      endpoint: null,
      method: 'POST',
      ip_address: '127.0.0.1',
      user_agent: 'msw',
      status_code: 200,
      request_id: null,
      details: {},
    });
    return HttpResponse.json(envelope(next, 'Reactivated'));
  }),

  http.get('/api/admin/markets/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    return HttpResponse.json(envelope({ items: adminMarkets }));
  }),

  http.get('/api/admin/markets/:id/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const market = adminMarkets.find((m) => m.id === Number(params.id));
    if (!market) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    return HttpResponse.json(envelope(market));
  }),

  http.post('/api/admin/markets/', async ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = (await request.json()) as AdminMarketPayload;
    const now = new Date().toISOString();
    const market = {
      id: Math.max(0, ...adminMarkets.map((m) => m.id)) + 1,
      name: body.name,
      address: body.address,
      description: body.description ?? null,
      image: body.image ?? null,
      latitude: body.latitude,
      longitude: body.longitude,
      operating_days: body.operating_days,
      open_time: body.open_time,
      close_time: body.close_time,
      upcoming_closures: [],
      farmer_count: 0,
      distance_km: null,
      is_favorite: false,
      map_provider: 'OSM',
      is_active: true,
      open_order_count: 0,
      created_at: now,
      updated_at: now,
    };
    setAdminMarkets([market, ...adminMarkets]);
    pushAudit({
      action: 'MARKET_CREATE',
      user: { id: 3, email: 'admin@demo.vn' },
      endpoint: null,
      method: 'POST',
      ip_address: '127.0.0.1',
      user_agent: 'msw',
      status_code: 200,
      request_id: null,
      details: { name: market.name },
    });
    return HttpResponse.json(envelope(market, 'Market created'), { status: 201 });
  }),

  http.patch('/api/admin/markets/:id/', async ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminMarkets.findIndex((m) => m.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const body = (await request.json()) as Partial<AdminMarketPayload>;
    const next = { ...adminMarkets[idx], ...body };
    const copy = [...adminMarkets];
    copy[idx] = next;
    setAdminMarkets(copy);
    return HttpResponse.json(envelope(next, 'Market updated'));
  }),

  http.post('/api/admin/markets/:id/activate/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminMarkets.findIndex((m) => m.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const next = { ...adminMarkets[idx], is_active: true };
    const copy = [...adminMarkets];
    copy[idx] = next;
    setAdminMarkets(copy);
    return HttpResponse.json(envelope(next, 'Market activated'));
  }),

  http.post('/api/admin/markets/:id/deactivate/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminMarkets.findIndex((m) => m.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const next = { ...adminMarkets[idx], is_active: false };
    const copy = [...adminMarkets];
    copy[idx] = next;
    setAdminMarkets(copy);
    pushAudit({
      action: 'MARKET_DEACTIVATE',
      user: { id: 3, email: 'admin@demo.vn' },
      endpoint: null,
      method: 'POST',
      ip_address: '127.0.0.1',
      user_agent: 'msw',
      status_code: 200,
      request_id: null,
      details: { name: next.name },
    });
    return HttpResponse.json(envelope(next, 'Market deactivated'));
  }),

  http.get('/api/admin/categories/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const sorted = [...adminCategories].sort((a, b) => a.display_order - b.display_order);
    return HttpResponse.json(envelope(sorted));
  }),

  http.post('/api/admin/categories/', async ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = (await request.json()) as {
      name: string;
      icon: string | null;
    };
    const cat = {
      id: Math.max(0, ...adminCategories.map((c) => c.id)) + 1,
      name: body.name,
      icon: body.icon,
      display_order: adminCategories.length + 1,
      is_active: true,
      product_count: 0,
    };
    setAdminCategories([...adminCategories, cat]);
    return HttpResponse.json(envelope(cat, 'Category created'), { status: 201 });
  }),

  http.patch('/api/admin/categories/:id/', async ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminCategories.findIndex((c) => c.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const body = (await request.json()) as Partial<{
      name: string;
      icon: string | null;
      is_active: boolean;
    }>;
    const next = {
      ...adminCategories[idx],
      name: body.name ?? adminCategories[idx].name,
      icon: body.icon !== undefined ? body.icon : adminCategories[idx].icon,
      is_active: body.is_active ?? adminCategories[idx].is_active,
    };
    const copy = [...adminCategories];
    copy[idx] = next;
    setAdminCategories(copy);
    return HttpResponse.json(envelope(next, 'Updated'));
  }),

  http.delete('/api/admin/categories/:id/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const cat = adminCategories.find((c) => c.id === Number(params.id));
    if (!cat) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    if (cat.product_count > 0) {
      return HttpResponse.json(
        errorEnvelope('Category is in use', 'RESOURCE_IN_USE'),
        { status: 400 },
      );
    }
    setAdminCategories(adminCategories.filter((c) => c.id !== Number(params.id)));
    return HttpResponse.json(envelope(null, 'Category deleted'));
  }),

  http.get('/api/admin/products/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    return HttpResponse.json(envelope({ items: moderationProducts }));
  }),

  http.post('/api/admin/products/:id/hide/', async ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = moderationProducts.findIndex((p) => p.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim() ?? '';
    if (reason.length < 3) {
      return HttpResponse.json(errorEnvelope('Enter a hide reason', 'VALIDATION_ERROR'), {
        status: 400,
      });
    }
    const next = {
      ...moderationProducts[idx],
      is_hidden: true,
      hide_reason: reason,
    };
    const copy = [...moderationProducts];
    copy[idx] = next;
    setModerationProducts(copy);
    return HttpResponse.json(envelope(next, 'Product hidden'));
  }),

  http.post('/api/admin/products/:id/restore/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = moderationProducts.findIndex((p) => p.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const next = {
      ...moderationProducts[idx],
      is_hidden: false,
      hide_reason: null,
    };
    const copy = [...moderationProducts];
    copy[idx] = next;
    setModerationProducts(copy);
    return HttpResponse.json(envelope(next, 'Restored'));
  }),

  http.get('/api/admin/reviews/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    return HttpResponse.json(envelope({ items: moderationReviews }));
  }),

  http.post('/api/admin/farmer-reviews/:id/hide/', async ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = moderationReviews.findIndex((r) => r.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim() ?? '';
    if (reason.length < 3) {
      return HttpResponse.json(errorEnvelope('Enter a hide reason', 'VALIDATION_ERROR'), {
        status: 400,
      });
    }
    const next = {
      ...moderationReviews[idx],
      is_hidden: true,
      hide_reason: reason,
    };
    const copy = [...moderationReviews];
    copy[idx] = next;
    setModerationReviews(copy);
    return HttpResponse.json(envelope(next, 'Review hidden'));
  }),

  http.post('/api/admin/farmer-reviews/:id/restore/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = moderationReviews.findIndex((r) => r.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const next = {
      ...moderationReviews[idx],
      is_hidden: false,
      hide_reason: null,
    };
    const copy = [...moderationReviews];
    copy[idx] = next;
    setModerationReviews(copy);
    return HttpResponse.json(envelope(next, 'Restored'));
  }),

  http.post('/api/admin/product-reviews/:id/hide/', async ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = moderationReviews.findIndex((r) => r.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const body = (await request.json()) as { reason?: string };
    const reason = body.reason?.trim() ?? '';
    if (reason.length < 3) {
      return HttpResponse.json(errorEnvelope('Enter a hide reason', 'VALIDATION_ERROR'), {
        status: 400,
      });
    }
    const next = {
      ...moderationReviews[idx],
      is_hidden: true,
      hide_reason: reason,
    };
    const copy = [...moderationReviews];
    copy[idx] = next;
    setModerationReviews(copy);
    return HttpResponse.json(envelope(next, 'Review hidden'));
  }),

  http.post('/api/admin/product-reviews/:id/restore/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = moderationReviews.findIndex((r) => r.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const next = {
      ...moderationReviews[idx],
      is_hidden: false,
      hide_reason: null,
    };
    const copy = [...moderationReviews];
    copy[idx] = next;
    setModerationReviews(copy);
    return HttpResponse.json(envelope(next, 'Restored'));
  }),

  http.get('/api/admin/reports/summary/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const marketId = url.searchParams.get('market_id');
    let orders = [...customerOrders];
    if (from) orders = orders.filter((o) => o.created_at.slice(0, 10) >= from);
    if (to) orders = orders.filter((o) => o.created_at.slice(0, 10) <= to);
    if (marketId) orders = orders.filter((o) => o.market.id === Number(marketId));

    const statusMap = new Map<OrderStatus, number>();
    for (const o of orders) {
      statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
    }
    const marketMap = new Map<
      number,
      { market_id: number; market_name: string; completed_orders: number; revenue: number }
    >();
    for (const o of orders.filter((x) => x.status === 'COMPLETED')) {
      const prev = marketMap.get(o.market.id);
      if (prev) {
        prev.completed_orders += 1;
        prev.revenue += moneyToNumber(o.total_amount);
      } else {
        marketMap.set(o.market.id, {
          market_id: o.market.id,
          market_name: o.market.name,
          completed_orders: 1,
          revenue: moneyToNumber(o.total_amount),
        });
      }
    }
    const farmerMap = new Map<
      number,
      { farmer_id: number; stall_name: string; completed_orders: number; revenue: number }
    >();
    for (const o of orders) {
      const prev = farmerMap.get(o.farmer.id);
      const rev = o.status === 'COMPLETED' ? moneyToNumber(o.total_amount) : 0;
      if (prev) {
        prev.completed_orders += 1;
        prev.revenue += rev;
      } else {
        farmerMap.set(o.farmer.id, {
          farmer_id: o.farmer.id,
          stall_name: o.farmer.stall_name,
          completed_orders: 1,
          revenue: rev,
        });
      }
    }
    return HttpResponse.json(
      envelope({
        orders_by_status: [...statusMap.entries()].map(([status, count]) => ({
          status,
          count,
        })),
        revenue_by_market: [...marketMap.values()].map((m) => ({
          market_id: m.market_id,
          market_name: m.market_name,
          completed_orders: m.completed_orders,
          revenue: String(m.revenue),
        })),
        top_farmers: [...farmerMap.values()]
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
          .map((f) => ({
            farmer_id: f.farmer_id,
            stall_name: f.stall_name,
            completed_orders: f.completed_orders,
            revenue: String(f.revenue),
            rating_avg: null,
          })),
      }),
    );
  }),

  http.get('/api/admin/reports/export/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const from = url.searchParams.get('from') ?? '';
    const to = url.searchParams.get('to') ?? '';
    const rows = [
      'code,status,farmer,market,total,created_at',
      ...customerOrders
        .filter((o) => {
          const d = o.created_at.slice(0, 10);
          if (from && d < from) return false;
          if (to && d > to) return false;
          return true;
        })
        .map(
          (o) =>
            `${String(o.id)},${o.status},${o.farmer.stall_name},${o.market.name},${o.total_amount},${o.created_at}`,
        ),
    ];
    return new HttpResponse(rows.join('\n'), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="marketlink-report.xlsx"',
      },
    });
  }),

  http.get('/api/admin/announcements/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    return HttpResponse.json(envelope({ items: adminAnnouncements }));
  }),

  http.post('/api/admin/announcements/', async ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = (await request.json()) as {
      title: string;
      content: string;
      audience: 'ALL' | 'CUSTOMER' | 'FARMER';
      starts_at: string;
      ends_at: string | null;
      is_active: boolean;
    };
    const now = new Date().toISOString();
    const item = {
      id: Math.max(0, ...adminAnnouncements.map((a) => a.id)) + 1,
      title: body.title,
      content: body.content,
      audience: body.audience,
      starts_at: body.starts_at,
      ends_at: body.ends_at,
      is_active: body.is_active,
      created_by_name: 'Administrator',
      created_at: now,
      updated_at: now,
    };
    setAdminAnnouncements([item, ...adminAnnouncements]);
    return HttpResponse.json(envelope(item, 'Announcement created'), { status: 201 });
  }),

  http.patch('/api/admin/announcements/:id/', async ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = adminAnnouncements.findIndex((a) => a.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const body = (await request.json()) as Partial<(typeof adminAnnouncements)[number]>;
    const next = { ...adminAnnouncements[idx], ...body, id: adminAnnouncements[idx].id };
    const copy = [...adminAnnouncements];
    copy[idx] = next;
    setAdminAnnouncements(copy);
    return HttpResponse.json(envelope(next, 'Updated'));
  }),

  http.delete('/api/admin/announcements/:id/', ({ params, request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    setAdminAnnouncements(adminAnnouncements.filter((a) => a.id !== Number(params.id)));
    return HttpResponse.json(envelope(null, 'Deleted'));
  }),

  http.get('/api/admin/audit-logs/', ({ request }) => {
    if (!authAdmin(request)) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const user = url.searchParams.get('user');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    let list = [...auditLogs];
    if (action) list = list.filter((l) => l.action === action);
    if (user) list = list.filter((l) => (l.user?.email ?? '').includes(user));
    if (from) list = list.filter((l) => l.created_at.slice(0, 10) >= from);
    if (to) list = list.filter((l) => l.created_at.slice(0, 10) <= to);
    return HttpResponse.json(envelope({ items: list }));
  }),
];
