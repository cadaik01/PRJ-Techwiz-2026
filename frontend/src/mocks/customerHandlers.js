import {
  farmers,
  markets,
  pickupOptions,
  products,
  toFarmerSummary,
  toProductCard,
} from './catalog';
import {
  envelope,
  errorEnvelope,
  getCustomerProfile,
  getUserByAccess,
  paginate,
} from './data';
import { farmerNotifications } from './farmerData';
import { numParam, pageParams } from './mockUtils';
import {
  bumpOrderVersion,
  customerNotifications,
  customerOrders,
  isOpenStatus,
  setOrders,
  toOrderSummary,
} from './orders';

import { moneyToNumber } from '@/utils/helpers/domain';
import { http, HttpResponse } from 'msw';

const favoriteIds = {
  farmer_ids: [2],
  product_ids: [2, 6],
  market_ids: [1],
};

let nextOrderId = 100;
let nextItemId = 1000;

function auth(request) {
  return getUserByAccess(request.headers.get('Authorization'));
}

function findOrder(id) {
  return customerOrders.find((o) => o.id === id);
}

function replaceOrder(updated) {
  setOrders(customerOrders.map((o) => (o.id === updated.id ? updated : o)));
  return updated;
}

function ifMatchVersion(request, order) {
  const header = request.headers.get('If-Match');
  if (!header) return true;
  return Number(header) === order.version;
}

/** Re-enter MSW for parked farmer-only handlers (role-shared flat paths). */
function forwardFarmer(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return fetch(url, { headers: request.headers });
}

export const customerHandlers = [
  http.get('/api/dashboard/', ({ request }) => {
    const user = auth(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    if (user.role === 'FARMER') {
      return forwardFarmer(request, '/api/__farmer_only/dashboard/');
    }
    if (user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Forbidden', 'FORBIDDEN'), {
        status: 403,
      });
    }
    const open = customerOrders.filter((o) => isOpenStatus(o.status));
    const favorite_farmers = farmers
      .filter((f) => favoriteIds.farmer_ids.includes(f.id))
      .map(toFarmerSummary);
    const favorite_markets = markets
      .filter((m) => favoriteIds.market_ids.includes(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name,
        address: m.address,
        image: m.image,
        latitude: m.latitude,
        longitude: m.longitude,
        operating_days: m.operating_days,
        open_time: m.open_time,
        close_time: m.close_time,
        upcoming_closures: m.upcoming_closures,
        farmer_count: m.farmer_count,
        distance_km: m.distance_km,
        is_favorite: true,
      }));
    const completed = customerOrders.filter((o) => o.status === 'COMPLETED');
    return HttpResponse.json(
      envelope({
        counts: {
          open: open.length,
          ready_for_pickup: customerOrders.filter((o) => o.status === 'READY_FOR_PICKUP')
            .length,
          completed: completed.length,
          pending_review: completed.filter(
            (o) =>
              o.review_state != null &&
              (!o.review_state.farmer_reviewed ||
                o.review_state.items_pending_review.length > 0),
          ).length,
        },
        upcoming: open.slice(0, 5).map(toOrderSummary),
        favorite_farmers,
        favorite_markets,
        last_order_id: customerOrders[0]?.id ?? null,
        recent_notifications: customerNotifications.slice(0, 5),
      }),
    );
  }),

  http.get('/api/orders/', ({ request }) => {
    const user = auth(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    if (user.role === 'FARMER') {
      return forwardFarmer(request, '/api/__farmer_only/orders/');
    }
    if (user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const { page, page_size } = pageParams(url);
    const tab = url.searchParams.get('tab') ?? 'all';
    let list = [...customerOrders];
    if (tab === 'open') list = list.filter((o) => isOpenStatus(o.status));
    if (tab === 'history') list = list.filter((o) => !isOpenStatus(o.status));
    const farmerId = url.searchParams.get('farmer_id');
    if (farmerId) list = list.filter((o) => o.farmer.id === Number(farmerId));
    return HttpResponse.json(
      envelope(paginate(list.map(toOrderSummary), page, page_size)),
    );
  }),

  http.get('/api/orders/:id/', ({ params, request }) => {
    const user = auth(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    if (user.role === 'FARMER') {
      return forwardFarmer(request, `/api/__farmer_only/orders/${numParam(params.id)}/`);
    }
    if (user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = findOrder(numParam(params.id));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    return HttpResponse.json(envelope(order));
  }),

  http.post('/api/orders/', async ({ request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = await request.json();
    const created = [];

    for (const group of body.groups) {
      const options = pickupOptions[group.farmer_id] ?? [];
      let slotMeta = null;

      for (const opt of options) {
        for (const dateOpt of opt.dates) {
          if (dateOpt.date !== group.pickup_date) continue;
          const slot = dateOpt.slots.find(
            (s) => s.pickup_slot_id === group.pickup_slot_id,
          );
          if (slot) {
            slotMeta = {
              market_id: opt.market_id,
              market_name: opt.market_name,
              stall_label: opt.stall_label,
              latitude: opt.latitude,
              longitude: opt.longitude,
              start_time: slot.start_time,
              end_time: slot.end_time,
            };
          }
        }
      }

      if (!slotMeta) {
        return HttpResponse.json(errorEnvelope('Invalid pickup slot', 'INVALID_SLOT'), {
          status: 400,
        });
      }

      const farmerSeed = farmers.find((f) => f.id === group.farmer_id);
      const items = [];
      for (const line of group.items) {
        const product = products.find((p) => p.id === line.product_id);
        if (!product || product.farmer.id !== group.farmer_id) {
          return HttpResponse.json(errorEnvelope('Invalid product', 'INVALID_PRODUCT'), {
            status: 400,
          });
        }
        if (product.stock_quantity < line.quantity) {
          return HttpResponse.json(errorEnvelope('Out of stock', 'OUT_OF_STOCK'), {
            status: 400,
          });
        }
        const lineTotal = moneyToNumber(product.price) * line.quantity;
        items.push({
          id: nextItemId++,
          product_id: product.id,
          product_name: product.name,
          unit: product.unit,
          unit_price: product.price,
          quantity: line.quantity,
          line_total: String(lineTotal),
          product_image: product.image,
        });
      }

      const total = items.reduce((s, i) => s + moneyToNumber(i.line_total), 0);
      const market = markets.find((m) => m.id === slotMeta.market_id);
      const createdAt = new Date().toISOString();
      const order = {
        id: nextOrderId++,
        status: 'PLACED',
        is_overdue: false,
        version: 1,
        customer: {
          id: user.id,
          full_name: user.display_name,
          phone: '0901234567',
        },
        farmer: {
          id: group.farmer_id,
          stall_name: farmerSeed?.stall_name ?? 'Farmer',
          phone: farmerSeed?.phone ?? '',
        },
        market: {
          id: slotMeta.market_id,
          name: slotMeta.market_name,
          address: market?.address ?? '',
          latitude: slotMeta.latitude,
          longitude: slotMeta.longitude,
        },
        stall_label: slotMeta.stall_label,
        pickup_date: group.pickup_date,
        pickup_start_at: `${group.pickup_date}T${slotMeta.start_time}:00+07:00`,
        pickup_end_at: `${group.pickup_date}T${slotMeta.end_time}:00+07:00`,
        cutoff_at: new Date(Date.now() + 12 * 3600_000).toISOString(),
        item_count: items.length,
        total_amount: String(total),
        created_at: createdAt,
        pickup_slot_id: group.pickup_slot_id,
        note: group.note ?? null,
        items,
        status_history: [
          {
            from_status: null,
            to_status: 'PLACED',
            transition: 'CREATE',
            actor_role: 'CUSTOMER',
            actor_name: user.display_name,
            change_reason: null,
            created_at: createdAt,
          },
        ],
        allowed_actions: ['CANCEL', 'MODIFY'],
        review_state: null,
      };
      created.push(order);
    }

    setOrders([...created, ...customerOrders]);
    return HttpResponse.json(envelope({ orders: created.map(toOrderSummary) }), {
      status: 201,
    });
  }),

  http.patch('/api/orders/:id/', async ({ params, request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = findOrder(numParam(params.id));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    if (!ifMatchVersion(request, order)) {
      return HttpResponse.json(errorEnvelope('Conflict', 'VERSION_CONFLICT'), {
        status: 409,
      });
    }
    const body = await request.json();
    let next = { ...order };

    if (body.items) {
      const items = body.items.map((line) => {
        const existing = order.items.find((i) => i.product_id === line.product_id);
        const product = products.find((p) => p.id === line.product_id);
        const unitPrice = existing?.unit_price ?? product?.price ?? '0';
        const lineTotal = moneyToNumber(unitPrice) * line.quantity;
        const unit = existing?.unit ?? product?.unit ?? 'KG';
        return {
          id: existing?.id ?? nextItemId++,
          product_id: line.product_id,
          product_name: existing?.product_name ?? product?.name ?? 'Product',
          unit,
          unit_price: unitPrice,
          quantity: line.quantity,
          line_total: String(lineTotal),
          product_image: existing?.product_image ?? product?.image ?? null,
        };
      });
      next = {
        ...next,
        items,
        item_count: items.length,
        total_amount: String(items.reduce((s, i) => s + moneyToNumber(i.line_total), 0)),
      };
    }
    if (body.pickup_slot_id !== undefined) next.pickup_slot_id = body.pickup_slot_id;
    if (body.pickup_date !== undefined) next.pickup_date = body.pickup_date;
    if (body.note !== undefined) next.note = body.note;

    next = bumpOrderVersion(next);
    return HttpResponse.json(envelope(replaceOrder(next)));
  }),

  http.post('/api/orders/:id/cancel/', async ({ params, request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = findOrder(numParam(params.id));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    if (!ifMatchVersion(request, order)) {
      return HttpResponse.json(errorEnvelope('Conflict', 'VERSION_CONFLICT'), {
        status: 409,
      });
    }
    await request.json();
    const next = bumpOrderVersion({
      ...order,
      status: 'CANCELLED',
      allowed_actions: ['REORDER'],
      status_history: [
        ...order.status_history,
        {
          from_status: order.status,
          to_status: 'CANCELLED',
          transition: 'CANCEL',
          actor_role: 'CUSTOMER',
          actor_name: user.display_name,
          change_reason: null,
          created_at: new Date().toISOString(),
        },
      ],
    });
    return HttpResponse.json(envelope(replaceOrder(next)));
  }),

  http.get('/api/orders/:id/reorder-preview/', ({ params, request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = findOrder(numParam(params.id));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const items = [];
    const skipped = [];
    for (const item of order.items) {
      const product = products.find((p) => p.id === item.product_id);
      if (!product || product.availability !== 'IN_STOCK') {
        skipped.push({
          product_id: item.product_id,
          product_name: item.product_name,
          reason: product && !product.is_available ? 'UNAVAILABLE' : 'OUT_OF_STOCK',
        });
      } else {
        items.push({
          product: toProductCard(product),
          quantity: item.quantity,
        });
      }
    }
    return HttpResponse.json(envelope({ items, skipped }));
  }),

  http.post('/api/orders/:orderId/farmer-review/', async ({ params, request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = findOrder(numParam(params.orderId));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    await request.json();
    const review_state = {
      farmer_reviewed: true,
      items_pending_review: order.review_state?.items_pending_review ?? [],
    };
    const next = bumpOrderVersion({
      ...order,
      review_state,
      allowed_actions: order.allowed_actions.filter((a) => a !== 'REVIEW'),
    });
    return HttpResponse.json(envelope(replaceOrder(next)));
  }),

  http.post('/api/orders/:orderId/items/:itemId/review/', async ({ params, request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = findOrder(numParam(params.orderId));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    await request.json();
    const itemId = numParam(params.itemId);
    const item = order.items.find((i) => i.id === itemId);
    const pending = (order.review_state?.items_pending_review ?? []).filter(
      (pid) => pid !== item?.product_id,
    );
    const review_state = {
      farmer_reviewed: order.review_state?.farmer_reviewed ?? false,
      items_pending_review: pending,
    };
    const done =
      review_state.farmer_reviewed && review_state.items_pending_review.length === 0;
    const next = bumpOrderVersion({
      ...order,
      review_state,
      allowed_actions: done
        ? order.allowed_actions.filter((a) => a !== 'REVIEW')
        : order.allowed_actions,
    });
    return HttpResponse.json(envelope(replaceOrder(next)));
  }),

  http.get('/api/favorite-ids/', ({ request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    return HttpResponse.json(envelope(favoriteIds));
  }),

  http.post('/api/favorite-farmers/', async ({ request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = await request.json();
    if (!favoriteIds.farmer_ids.includes(body.farmer_id)) {
      favoriteIds.farmer_ids.push(body.farmer_id);
    }
    return HttpResponse.json(envelope(null));
  }),

  http.delete('/api/favorite-farmers/:id/', ({ params, request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const id = numParam(params.id);
    favoriteIds.farmer_ids = favoriteIds.farmer_ids.filter((x) => x !== id);
    return HttpResponse.json(envelope(null));
  }),

  http.post('/api/favorite-products/', async ({ request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = await request.json();
    if (!favoriteIds.product_ids.includes(body.product_id)) {
      favoriteIds.product_ids.push(body.product_id);
    }
    return HttpResponse.json(envelope(null));
  }),

  http.delete('/api/favorite-products/:id/', ({ params, request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const id = numParam(params.id);
    favoriteIds.product_ids = favoriteIds.product_ids.filter((x) => x !== id);
    return HttpResponse.json(envelope(null));
  }),

  http.post('/api/favorite-markets/', async ({ request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = await request.json();
    if (!favoriteIds.market_ids.includes(body.market_id)) {
      favoriteIds.market_ids.push(body.market_id);
    }
    return HttpResponse.json(envelope(null));
  }),

  http.delete('/api/favorite-markets/:id/', ({ params, request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const id = numParam(params.id);
    favoriteIds.market_ids = favoriteIds.market_ids.filter((x) => x !== id);
    return HttpResponse.json(envelope(null));
  }),

  http.get('/api/notifications/', ({ request }) => {
    const user = auth(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    if (user.role === 'FARMER') {
      return forwardFarmer(request, '/api/__farmer_only/notifications/');
    }
    const { page, page_size } = pageParams(new URL(request.url));
    return HttpResponse.json(envelope(paginate(customerNotifications, page, page_size)));
  }),

  http.get('/api/notifications/unread-count/', ({ request }) => {
    const user = auth(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const list = user.role === 'FARMER' ? farmerNotifications : customerNotifications;
    return HttpResponse.json(
      envelope({
        unread_count: list.filter((n) => !n.is_read).length,
      }),
    );
  }),

  http.post('/api/notifications/:id/read/', ({ params, request }) => {
    const user = auth(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const id = numParam(params.id);
    const list = user.role === 'FARMER' ? farmerNotifications : customerNotifications;
    const idx = list.findIndex((n) => n.id === id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        is_read: true,
        read_at: new Date().toISOString(),
      };
    }
    return HttpResponse.json(envelope(null));
  }),

  http.post('/api/notifications/read-all/', ({ request }) => {
    const user = auth(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const list = user.role === 'FARMER' ? farmerNotifications : customerNotifications;
    for (let i = 0; i < list.length; i += 1) {
      list[i] = {
        ...list[i],
        is_read: true,
        read_at: list[i].read_at ?? new Date().toISOString(),
      };
    }
    return HttpResponse.json(envelope(null));
  }),

  http.get('/api/customer-profiles/me/', ({ request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const profile = getCustomerProfile(user.id);
    return HttpResponse.json(
      envelope({
        full_name: profile?.full_name ?? user.display_name,
        phone: profile?.phone ?? '',
        address: profile?.address ?? '',
        email: user.email,
      }),
    );
  }),

  http.patch('/api/customer-profiles/me/', async ({ request }) => {
    const user = auth(request);
    if (!user || user.role !== 'CUSTOMER') {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = await request.json();

    return HttpResponse.json(
      envelope({
        full_name: body.full_name,
        phone: body.phone,
        address: body.address,
        email: user.email,
      }),
    );
  }),
];
