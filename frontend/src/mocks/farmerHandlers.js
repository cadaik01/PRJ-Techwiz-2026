import {
  allMarkets,
  bumpProductEtag,
  categoryName,
  createEmptySlot,
  DEMO_FARMER_ID,
  farmerMarkets,
  farmerNotifications,
  farmerProducts,
  farmerProfile,
  farmerReviews,
  replyFarmerReview,
  setFarmerMarkets,
  setFarmerProducts,
  setFarmerProfile,
} from '@/mocks/farmerData';
import { envelope, errorEnvelope, getUserByAccess, paginate } from '@/mocks/data';
import {
  bumpOrderVersion,
  customerOrders,
  isOpenStatus,
  setOrders,
  toOrderSummary,
} from '@/mocks/orders';

import { moneyToNumber, productAvailability } from '@/utils/helpers/domain';
import { http, HttpResponse } from 'msw';

function authFarmer(request         ) {
  const user = getUserByAccess(request.headers.get('Authorization'));
  if (!user || user.role !== 'FARMER') return null;
  return user;
}

function isOverdue(order             , now = Date.now()) {
  return isOpenStatus(order.status) && new Date(order.pickup_end_at).getTime() < now;
}

function computeActions(order             , now = Date.now())                      {
  const available                      = [];
  const cutoffPassed = now >= new Date(order.cutoff_at).getTime();
  const pickupEnded = now >= new Date(order.pickup_end_at).getTime();

  if (order.status === 'PLACED') {
    available.push('ACCEPT', 'DECLINE');
  }
  if (order.status === 'ACCEPTED' && cutoffPassed) {
    available.push('READY');
  }
  if (order.status === 'READY_FOR_PICKUP' || order.status === 'ACCEPTED') {
    if (pickupEnded && (order.status === 'READY_FOR_PICKUP' || isOverdue(order, now))) {
      available.push('COMPLETE', 'NO_SHOW');
    }
  }
  if (order.status === 'READY_FOR_PICKUP' && pickupEnded) {
    if (!available.includes('COMPLETE')) available.push('COMPLETE');
    if (!available.includes('NO_SHOW')) available.push('NO_SHOW');
  }

  return available;
}

function toFarmerSummary(order             )                     {
  return {
    ...toOrderSummary(order),
    allowed_actions: computeActions(order),
  };
}

function toFarmerDetail(order             )                    {
  return {
    ...order,
    allowed_actions: computeActions(order),
  };
}

function farmerOrderList(farmerId        ) {
  return customerOrders.filter((o) => o.farmer.id === farmerId);
}

function replaceOrder(updated             ) {
  const idx = customerOrders.findIndex((o) => o.id === updated.id);
  if (idx < 0) return;
  const copy = [...customerOrders];
  copy[idx] = updated;
  setOrders(copy);
}

function checkIfMatch(request         , version        ) {
  const match = request.headers.get('If-Match');
  if (match && Number(match) !== version) {
    return HttpResponse.json(
      errorEnvelope('Resource was modified', 'RESOURCE_MODIFIED'),
      { status: 409 },
    );
  }
  return null;
}

function productStateFilter(p               , state               )          {
  if (!state) return !p.is_archived;
  if (state === 'archived') return p.is_archived;
  if (state === 'hidden') return p.is_hidden_by_admin;
  if (state === 'in_stock') return p.availability === 'IN_STOCK' && !p.is_archived;
  if (state === 'out_of_stock')
    return p.availability === 'OUT_OF_STOCK' && !p.is_archived;
  if (state === 'unavailable') return p.availability === 'UNAVAILABLE' && !p.is_archived;
  return true;
}

export const farmerHandlers = [
  http.get('/api/__farmer_only/dashboard/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const orders = farmerOrderList(user.id);
    const inRange = orders.filter((o) => {
      if (!from && !to) return true;
      const d = o.created_at.slice(0, 10);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    const completed = inRange.filter((o) => o.status === 'COMPLETED');
    const revenue = completed.reduce((s, o) => s + moneyToNumber(o.total_amount), 0);
    const pending = orders.filter((o) => o.status === 'PLACED').length;
    const processing = orders.filter(
      (o) => o.status === 'ACCEPTED' || o.status === 'READY_FOR_PICKUP',
    ).length;
    const overdue = orders.filter((o) => isOverdue(o)).length;

    const dayMap = new Map                ();
    for (const o of completed) {
      const day = o.pickup_date;
      dayMap.set(day, (dayMap.get(day) ?? 0) + moneyToNumber(o.total_amount));
    }
    const revenue_by_day = [...dayMap.entries()]
      .map(([date, amount]) => ({ date, revenue: String(amount) }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const productMap = new Map();
    for (const o of completed) {
      for (const item of o.items) {
        const prev = productMap.get(item.product_id);
        if (prev) {
          prev.quantity_sold += item.quantity;
          prev.revenue += moneyToNumber(item.line_total);
        } else {
          productMap.set(item.product_id, {
            product_id: item.product_id,
            name: item.product_name,
            quantity_sold: item.quantity,
            revenue: moneyToNumber(item.line_total),
          });
        }
      }
    }
    const top_products = [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({
        product_id: p.product_id,
        name: p.name,
        quantity_sold: p.quantity_sold,
        revenue: String(p.revenue),
      }));

    const upcoming = orders
      .filter((o) => isOpenStatus(o.status) && !isOverdue(o))
      .sort((a, b) => a.pickup_start_at.localeCompare(b.pickup_start_at))
      .slice(0, 5)
      .map(toOrderSummary);

    return HttpResponse.json(
      envelope({
        kpis: {
          total_orders: inRange.length,
          pending_approval: pending,
          in_progress: processing,
          revenue: String(revenue),
        },
        revenue_by_day,
        top_products,
        overdue_open_count: overdue,
        upcoming,
        status: farmerProfile.status,
        status_reason: farmerProfile.status_reason,
      }),
    );
  }),

  http.get('/api/orders/counts/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const orders = farmerOrderList(user.id);
    return HttpResponse.json(
      envelope({
        pending: orders.filter((o) => o.status === 'PLACED').length,
        accepted: orders.filter((o) => o.status === 'ACCEPTED' && !isOverdue(o)).length,
        ready: orders.filter((o) => o.status === 'READY_FOR_PICKUP').length,
        history: orders.filter(
          (o) =>
            o.status === 'COMPLETED' ||
            o.status === 'DECLINED' ||
            o.status === 'CANCELLED' ||
            o.status === 'EXPIRED' ||
            o.status === 'NO_SHOW',
        ).length,
        overdue: orders.filter((o) => isOverdue(o)).length,
      }),
    );
  }),

  http.get('/api/__farmer_only/orders/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const tab = url.searchParams.get('tab') ?? 'pending';
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const marketId = url.searchParams.get('market_id');
    const pickupDate = url.searchParams.get('pickup_date');
    const page = Number(url.searchParams.get('page') ?? 1);
    const page_size = Number(url.searchParams.get('page_size') ?? 20);

    let list = farmerOrderList(user.id);
    if (tab === 'pending') list = list.filter((o) => o.status === 'PLACED');
    else if (tab === 'accepted')
      list = list.filter((o) => o.status === 'ACCEPTED' && !isOverdue(o));
    else if (tab === 'ready') list = list.filter((o) => o.status === 'READY_FOR_PICKUP');
    else if (tab === 'overdue') list = list.filter((o) => isOverdue(o));
    else if (tab === 'history')
      list = list.filter(
        (o) =>
          o.status === 'COMPLETED' ||
          o.status === 'DECLINED' ||
          o.status === 'CANCELLED' ||
          o.status === 'EXPIRED' ||
          o.status === 'NO_SHOW',
      );

    if (marketId) list = list.filter((o) => o.market.id === Number(marketId));
    if (pickupDate) list = list.filter((o) => o.pickup_date === pickupDate);
    if (q) {
      list = list.filter((o) => {
        return String(o.id).includes(q) || o.customer.full_name.toLowerCase().includes(q);
      });
    }

    list = list.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return HttpResponse.json(
      envelope(paginate(list.map(toFarmerSummary), page, page_size)),
    );
  }),

  http.get('/api/__farmer_only/orders/:id/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = farmerOrderList(user.id).find((o) => o.id === Number(params.id));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Order not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    return HttpResponse.json(envelope(toFarmerDetail(order)));
  }),

  http.post('/api/orders/:id/accept/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = farmerOrderList(user.id).find((o) => o.id === Number(params.id));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Order not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const conflict = checkIfMatch(request, order.version);
    if (conflict) return conflict;
    if (order.status !== 'PLACED') {
      return HttpResponse.json(
        errorEnvelope('Invalid status transition', 'INVALID_STATUS_TRANSITION'),
        { status: 400 },
      );
    }
    const next = bumpOrderVersion({
      ...order,
      status: 'ACCEPTED',
      allowed_actions: computeActions({ ...order, status: 'ACCEPTED' }),
    });
    replaceOrder(next);
    return HttpResponse.json(envelope(toFarmerDetail(next), 'Order confirmed'));
  }),

  http.post('/api/orders/:id/decline/', async ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = farmerOrderList(user.id).find((o) => o.id === Number(params.id));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Order not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const conflict = checkIfMatch(request, order.version);
    if (conflict) return conflict;
    const body = (await request.json())                       ;
    const reason = body.reason?.trim() ?? '';
    if (reason.length < 5 || reason.length > 500) {
      return HttpResponse.json(
        errorEnvelope('Rejection reason must be 5–500 characters', 'VALIDATION_ERROR'),
        { status: 400 },
      );
    }
    if (order.status !== 'PLACED') {
      return HttpResponse.json(
        errorEnvelope('Invalid status transition', 'INVALID_STATUS_TRANSITION'),
        { status: 400 },
      );
    }
    const next = bumpOrderVersion({
      ...order,
      status: 'DECLINED',
      allowed_actions: [],
      status_history: [
        ...order.status_history,
        {
          from_status: order.status,
          to_status: 'DECLINED',
          transition: 'DECLINE',
          actor_role: 'FARMER',
          actor_name: farmerProfile.stall_name,
          change_reason: reason,
          created_at: new Date().toISOString(),
        },
      ],
    });
    replaceOrder(next);
    return HttpResponse.json(envelope(toFarmerDetail(next), 'Order rejected'));
  }),

  http.post('/api/orders/:id/ready/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = farmerOrderList(user.id).find((o) => o.id === Number(params.id));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Order not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const conflict = checkIfMatch(request, order.version);
    if (conflict) return conflict;
    if (order.status !== 'ACCEPTED') {
      return HttpResponse.json(
        errorEnvelope('Invalid status transition', 'INVALID_STATUS_TRANSITION'),
        { status: 400 },
      );
    }
    if (Date.now() < new Date(order.cutoff_at).getTime()) {
      return HttpResponse.json(errorEnvelope('Cut-off not reached yet', 'CUTOFF_NOT_REACHED'), {
        status: 400,
      });
    }
    const next = bumpOrderVersion({
      ...order,
      status: 'READY_FOR_PICKUP',
    });
    replaceOrder(next);
    return HttpResponse.json(envelope(toFarmerDetail(next), 'Ready for pickup'));
  }),

  http.post('/api/orders/:id/complete/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = farmerOrderList(user.id).find((o) => o.id === Number(params.id));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Order not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const conflict = checkIfMatch(request, order.version);
    if (conflict) return conflict;
    if (
      order.status !== 'READY_FOR_PICKUP' &&
      !(order.status === 'ACCEPTED' && isOverdue(order))
    ) {
      return HttpResponse.json(
        errorEnvelope('Invalid status transition', 'INVALID_STATUS_TRANSITION'),
        { status: 400 },
      );
    }
    if (Date.now() < new Date(order.pickup_end_at).getTime()) {
      return HttpResponse.json(
        errorEnvelope('Pickup window has not ended', 'PICKUP_NOT_ENDED'),
        { status: 400 },
      );
    }
    const next = bumpOrderVersion({
      ...order,
      status: 'COMPLETED',
      review_state: {
        farmer_reviewed: false,
        items_pending_review: order.items.map((i) => i.product_id),
      },
      allowed_actions: [],
    });
    replaceOrder(next);
    return HttpResponse.json(envelope(toFarmerDetail(next), 'Completed'));
  }),

  http.post('/api/orders/:id/no-show/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const order = farmerOrderList(user.id).find((o) => o.id === Number(params.id));
    if (!order) {
      return HttpResponse.json(errorEnvelope('Order not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const conflict = checkIfMatch(request, order.version);
    if (conflict) return conflict;
    if (
      order.status !== 'READY_FOR_PICKUP' &&
      !(order.status === 'ACCEPTED' && isOverdue(order))
    ) {
      return HttpResponse.json(
        errorEnvelope('Invalid status transition', 'INVALID_STATUS_TRANSITION'),
        { status: 400 },
      );
    }
    if (Date.now() < new Date(order.pickup_end_at).getTime()) {
      return HttpResponse.json(
        errorEnvelope('Pickup window has not ended', 'PICKUP_NOT_ENDED'),
        { status: 400 },
      );
    }
    const next = bumpOrderVersion({
      ...order,
      status: 'NO_SHOW',
      allowed_actions: [],
    });
    replaceOrder(next);
    return HttpResponse.json(envelope(toFarmerDetail(next), 'Marked as no-show'));
  }),

  http.get('/api/picking-list/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const pickupDate =
      url.searchParams.get('pickup_date') ?? new Date().toISOString().slice(0, 10);
    const map = new Map();
    for (const order of farmerOrderList(user.id)) {
      if (order.pickup_date !== pickupDate) continue;
      if (
        order.status !== 'ACCEPTED' &&
        order.status !== 'READY_FOR_PICKUP' &&
        order.status !== 'PLACED'
      ) {
        continue;
      }
      for (const item of order.items) {
        const prev = map.get(item.product_id);
        if (prev) {
          prev.total_qty += item.quantity;
          prev.order_count += 1;
        } else {
          map.set(item.product_id, {
            product_id: item.product_id,
            product_name: item.product_name,
            unit: item.unit,
            total_qty: item.quantity,
            order_count: 1,
          });
        }
      }
    }
    return HttpResponse.json(envelope([...map.values()]));
  }),

  http.get('/api/__farmer_only/products/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const state = url.searchParams.get('state');
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const page = Number(url.searchParams.get('page') ?? 1);
    const page_size = Number(url.searchParams.get('page_size') ?? 20);
    let list = farmerProducts.filter((p) => productStateFilter(p, state));
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    return HttpResponse.json(envelope(paginate(list, page, page_size)));
  }),

  http.get('/api/__farmer_only/products/:id/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const product = farmerProducts.find((p) => p.id === Number(params.id));
    if (!product) {
      return HttpResponse.json(errorEnvelope('Product not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    return HttpResponse.json(envelope(product));
  }),

  http.post('/api/products/', async ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    if (user.farmer_status !== 'APPROVED') {
      return HttpResponse.json(
        errorEnvelope('Profile not approved', 'FARMER_NOT_APPROVED'),
        { status: 403 },
      );
    }
    const body = (await request.json())                        ;
    const id = Math.max(0, ...farmerProducts.map((p) => p.id)) + 1;
    const now = new Date().toISOString();
    const is_available = body.is_available ?? true;
    const product                = {
      id,
      name: body.name,
      image: body.image ?? null,
      price: body.price,
      unit: body.unit,
      stock_quantity: body.stock_quantity,
      is_available,
      availability: productAvailability(body.stock_quantity, is_available),
      category: { id: body.category_id, name: categoryName(body.category_id) },
      farmer: { id: DEMO_FARMER_ID, stall_name: farmerProfile.stall_name },
      rating_avg: null,
      rating_count: 0,
      is_favorite: null,
      description: body.description ?? null,
      markets: farmerMarkets.map((m) => ({
        market_id: m.market.id,
        market_name: m.market.name,
        days: m.market.operating_days,
      })),
      weekly_default_quantity: body.weekly_default_quantity ?? null,
      held_quantity: 0,
      pending_quantity: 0,
      is_archived: false,
      is_hidden_by_admin: false,
      hidden_reason: null,
      created_at: now,
      updated_at: now,
    };
    setFarmerProducts([product, ...farmerProducts]);
    return HttpResponse.json(envelope(product, 'Product created'), { status: 201 });
  }),

  http.patch('/api/products/:id/', async ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = farmerProducts.findIndex((p) => p.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Product not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const current = farmerProducts[idx];
    const body = (await request.json())                                 ;
    const stock_quantity = body.stock_quantity ?? current.stock_quantity;
    const is_available = body.is_available ?? current.is_available;
    let next                = {
      ...current,
      name: body.name ?? current.name,
      price: body.price ?? current.price,
      unit: body.unit ?? current.unit,
      stock_quantity,
      is_available,
      availability: productAvailability(
        stock_quantity,
        is_available,
        current.is_hidden_by_admin,
        current.is_archived,
      ),
      category: body.category_id
        ? { id: body.category_id, name: categoryName(body.category_id) }
        : current.category,
      description:
        body.description !== undefined ? body.description : current.description,
      image: body.image !== undefined ? body.image : current.image,
      weekly_default_quantity:
        body.weekly_default_quantity !== undefined
          ? body.weekly_default_quantity
          : current.weekly_default_quantity,
    };
    next = bumpProductEtag(next);
    const copy = [...farmerProducts];
    copy[idx] = next;
    setFarmerProducts(copy);
    return HttpResponse.json(envelope(next, 'Product updated'));
  }),

  http.post('/api/products/:id/mark-sold-out/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = farmerProducts.findIndex((p) => p.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Product not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const next = bumpProductEtag({
      ...farmerProducts[idx],
      stock_quantity: 0,
      is_available: false,
      availability: productAvailability(0, false),
    });
    const copy = [...farmerProducts];
    copy[idx] = next;
    setFarmerProducts(copy);
    return HttpResponse.json(envelope(next, 'Marked out of stock'));
  }),

  http.post('/api/products/:id/archive/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = farmerProducts.findIndex((p) => p.id === Number(params.id));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Product not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const next = bumpProductEtag({
      ...farmerProducts[idx],
      is_archived: true,
      is_available: false,
      availability: 'UNAVAILABLE',
    });
    const copy = [...farmerProducts];
    copy[idx] = next;
    setFarmerProducts(copy);
    return HttpResponse.json(envelope(next, 'Product archived'));
  }),

  http.get('/api/weekly-template/preview/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const overdue_orders = farmerOrderList(user.id)
      .filter((o) => isOverdue(o))
      .map(toOrderSummary);
    const changes = farmerProducts
      .filter((p) => !p.is_archived)
      .map((p) => ({
        product_id: p.id,
        product_name: p.name,
        current_stock: p.stock_quantity,
        new_stock: p.weekly_default_quantity ?? p.stock_quantity,
        held_quantity: p.held_quantity,
        pending_quantity: p.pending_quantity,
      }));
    return HttpResponse.json(
      envelope({
        can_apply: overdue_orders.length === 0,
        overdue_orders,
        changes,
      }),
    );
  }),

  http.post('/api/weekly-template/apply/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const overdue = farmerOrderList(user.id).filter((o) => isOverdue(o));
    if (overdue.length > 0) {
      return HttpResponse.json(
        errorEnvelope('Overdue orders still pending', 'OVERDUE_ORDERS_PENDING'),
        { status: 400 },
      );
    }
    const next = farmerProducts.map((p) => {
      if (p.is_archived) return p;
      const stock = p.weekly_default_quantity ?? 0;
      return bumpProductEtag({
        ...p,
        stock_quantity: stock,
        is_available: stock > 0,
        availability: productAvailability(stock, stock > 0),
        held_quantity: 0,
        pending_quantity: 0,
      });
    });
    setFarmerProducts(next);
    return HttpResponse.json(envelope({ applied: true }, 'Weekly stock template applied'));
  }),

  http.get('/api/farmer-markets/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    return HttpResponse.json(envelope(farmerMarkets));
  }),

  http.post('/api/farmer-markets/', async ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = (await request.json())

     ;
    if (farmerMarkets.some((m) => m.market.id === body.market_id)) {
      return HttpResponse.json(errorEnvelope('Already joined this market', 'VALIDATION_ERROR'), {
        status: 400,
      });
    }
    const market = allMarkets.find((m) => m.id === body.market_id);
    if (!market) {
      return HttpResponse.json(errorEnvelope('Market not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const membership = {
      id: Math.max(0, ...farmerMarkets.map((m) => m.id)) + 1,
      market: {
        id: market.id,
        name: market.name,
        address: market.address,
        image: market.image,
        latitude: market.latitude,
        longitude: market.longitude,
        operating_days: market.operating_days,
        open_time: market.open_time,
        close_time: market.close_time,
        upcoming_closures: market.upcoming_closures,
        farmer_count: market.farmer_count,
        distance_km: market.distance_km,
        is_favorite: market.is_favorite,
      },
      stall_label: body.stall_label,
      slots: []                ,
      open_order_count: 0,
    };
    setFarmerMarkets([...farmerMarkets, membership]);
    return HttpResponse.json(envelope(membership, 'Market added'), { status: 201 });
  }),

  http.patch('/api/farmer-markets/:farmerMarketId/', async ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const idx = farmerMarkets.findIndex((m) => m.id === Number(params.farmerMarketId));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Market not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const body = (await request.json())                                    ;
    const next = {
      ...farmerMarkets[idx],
      stall_label: body.stall_label ?? farmerMarkets[idx].stall_label,
    };
    const copy = [...farmerMarkets];
    copy[idx] = next;
    setFarmerMarkets(copy);
    return HttpResponse.json(envelope(next, 'Market updated'));
  }),

  http.delete('/api/farmer-markets/:farmerMarketId/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    setFarmerMarkets(farmerMarkets.filter((m) => m.id !== Number(params.farmerMarketId)));
    return HttpResponse.json(envelope(null, 'Left market'));
  }),

  http.post('/api/pickup-slots/', async ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = (await request.json())

     ;
    const idx = farmerMarkets.findIndex((m) => m.id === body.farmer_market_id);
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Market not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const slot = createEmptySlot(body.day_of_week);
    if (body.start_time) slot.start_time = body.start_time;
    if (body.end_time) slot.end_time = body.end_time;
    const membership = farmerMarkets[idx];
    const next = {
      ...membership,
      slots: [...membership.slots, slot],
    };
    const copy = [...farmerMarkets];
    copy[idx] = next;
    setFarmerMarkets(copy);
    return HttpResponse.json(envelope(slot, 'Time slot added'), { status: 201 });
  }),

  http.patch('/api/pickup-slots/:slotId/', async ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const slotId = Number(params.slotId);
    const body = (await request.json())                       ;
    const idx = farmerMarkets.findIndex((m) => m.slots.some((s) => s.id === slotId));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Market not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const membership = farmerMarkets[idx];
    const slots = membership.slots.map((s) => (s.id === slotId ? { ...s, ...body } : s));
    const next = { ...membership, slots };
    const copy = [...farmerMarkets];
    copy[idx] = next;
    setFarmerMarkets(copy);
    const slot = slots.find((s) => s.id === slotId);
    return HttpResponse.json(envelope(slot, 'Time slot updated'));
  }),

  http.delete('/api/pickup-slots/:slotId/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const slotId = Number(params.slotId);
    const idx = farmerMarkets.findIndex((m) => m.slots.some((s) => s.id === slotId));
    if (idx < 0) {
      return HttpResponse.json(errorEnvelope('Time slot not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const membership = farmerMarkets[idx];
    const next = {
      ...membership,
      slots: membership.slots.filter((s) => s.id !== slotId),
    };
    const copy = [...farmerMarkets];
    copy[idx] = next;
    setFarmerMarkets(copy);
    return HttpResponse.json(envelope(null, 'Time slot deleted'));
  }),

  http.get('/api/farmer-profiles/me/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    return HttpResponse.json(envelope(farmerProfile));
  }),

  http.patch('/api/farmer-profiles/me/', async ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = (await request.json())                                 ;
    const next = { ...farmerProfile, ...body, email: farmerProfile.email };
    setFarmerProfile(next);
    return HttpResponse.json(envelope(next, 'Stall profile updated'));
  }),

  http.get('/api/reviews/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const rating = url.searchParams.get('rating');
    const replied = url.searchParams.get('replied');
    let list = [...farmerReviews];
    if (type === 'FARMER' || type === 'PRODUCT') {
      list = list.filter((r) => r.type === type);
    }
    if (rating) list = list.filter((r) => r.rating === Number(rating));
    if (replied === 'true') list = list.filter((r) => Boolean(r.reply));
    if (replied === 'false') list = list.filter((r) => !r.reply);
    return HttpResponse.json(envelope({ items: list }));
  }),

  http.post('/api/reviews/:id/reply/', async ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const body = (await request.json())                      ;
    const reply = body.reply?.trim() ?? '';
    if (reply.length < 1 || reply.length > 500) {
      return HttpResponse.json(
        errorEnvelope('Reply must be 1–500 characters', 'VALIDATION_ERROR'),
        { status: 400 },
      );
    }
    const existing = farmerReviews.find((r) => r.id === Number(params.id));
    if (!existing) {
      return HttpResponse.json(errorEnvelope('Review not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    if (existing.reply) {
      return HttpResponse.json(
        errorEnvelope('Already replied to this review', 'REPLY_ALREADY_EXISTS'),
        { status: 400 },
      );
    }
    const updated = replyFarmerReview(Number(params.id), reply);
    return HttpResponse.json(envelope(updated, 'Reply sent'));
  }),

  http.get('/api/__farmer_only/notifications/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    return HttpResponse.json(
      envelope({
        items: farmerNotifications,
        unread_count: farmerNotifications.filter((n) => !n.is_read).length,
      }),
    );
  }),

  http.patch('/api/__farmer_only/notifications/:id/read/', ({ params, request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    const item = farmerNotifications.find((n) => n.id === Number(params.id));
    if (item) item.is_read = true;
    return HttpResponse.json(envelope(null));
  }),

  http.patch('/api/__farmer_only/notifications/read-all/', ({ request }) => {
    const user = authFarmer(request);
    if (!user) {
      return HttpResponse.json(errorEnvelope('Unauthorized', 'TOKEN_INVALID'), {
        status: 401,
      });
    }
    for (const n of farmerNotifications) n.is_read = true;
    return HttpResponse.json(envelope(null));
  }),
];
