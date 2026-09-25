import {
  announcements,
  categories,
  farmers,
  markets,
  pickupOptions,
  products,
  reviews,
  toFarmerSummary,
  toProductCard,
} from '@/mocks/catalog';
import { envelope, errorEnvelope, getUserByAccess, paginate } from '@/mocks/data';
import { numParam, pageParams } from '@/mocks/mockUtils';
import type { DayOfWeek, ProductCard, RatingSummary, Review } from '@/types';
import { moneyToNumber } from '@/types';
import { http, HttpResponse } from 'msw';

function forwardFarmer(request: Request, pathname: string) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return fetch(url, { headers: request.headers });
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ratingSummary(list: Review[]): RatingSummary {
  const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const r of list) {
    if (r.rating === 1) distribution['1'] += 1;
    else if (r.rating === 2) distribution['2'] += 1;
    else if (r.rating === 3) distribution['3'] += 1;
    else if (r.rating === 4) distribution['4'] += 1;
    else if (r.rating === 5) distribution['5'] += 1;
  }
  const rating_count = list.length;
  const rating_avg =
    rating_count === 0 ? null : list.reduce((s, r) => s + r.rating, 0) / rating_count;
  return { rating_avg, rating_count, distribution };
}

function reviewsPage(list: Review[], page: number, pageSize: number) {
  const paged = paginate(list, page, pageSize);
  return {
    summary: ratingSummary(list),
    results: paged.results,
    count: paged.count,
    page: paged.page,
    page_size: paged.page_size,
    total_pages: paged.total_pages,
    next: paged.next,
    previous: paged.previous,
  };
}

export const catalogHandlers = [
  http.get('/api/categories/', () => {
    return HttpResponse.json(envelope(categories));
  }),

  http.get('/api/announcements/', () => {
    return HttpResponse.json(envelope(announcements));
  }),

  http.get('/api/markets/', ({ request }) => {
    const url = new URL(request.url);
    const { page, page_size } = pageParams(url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const day = url.searchParams.get('day');
    const ordering = url.searchParams.get('ordering') ?? 'name';
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    let list = markets.map((m) => ({
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
      distance_km: hasCoords
        ? Math.round(haversineKm(lat, lng, m.latitude, m.longitude) * 10) / 10
        : null,
      is_favorite: m.is_favorite,
    }));

    if (q) {
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || m.address.toLowerCase().includes(q),
      );
    }
    if (day) {
      const d = Number(day) as DayOfWeek;
      list = list.filter((m) => m.operating_days.includes(d));
    }
    if (ordering === 'distance' && hasCoords) {
      list = [...list].sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
    } else if (ordering === 'name_desc') {
      list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    } else {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return HttpResponse.json(envelope(paginate(list, page, page_size)));
  }),

  http.get('/api/markets/:id/', ({ params, request }) => {
    const id = numParam(params.id);
    const market = markets.find((m) => m.id === id);
    if (!market) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const url = new URL(request.url);
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    return HttpResponse.json(
      envelope({
        ...market,
        distance_km: hasCoords
          ? Math.round(haversineKm(lat, lng, market.latitude, market.longitude) * 10) / 10
          : null,
      }),
    );
  }),

  http.get('/api/markets/:id/farmers/', ({ params }) => {
    const id = numParam(params.id);
    const list = farmers
      .filter((f) => f.markets.some((m) => m.market_id === id))
      .map(toFarmerSummary);
    return HttpResponse.json(envelope(list));
  }),

  http.get('/api/farmers/', ({ request }) => {
    const url = new URL(request.url);
    const { page, page_size } = pageParams(url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const ordering = url.searchParams.get('ordering') ?? 'name';
    const marketId = url.searchParams.get('market_id');
    const day = url.searchParams.get('day');
    const categoryId = url.searchParams.get('category_id');
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    let list = farmers.map((f) => {
      const summary = toFarmerSummary(f);
      return {
        ...summary,
        distance_km:
          hasCoords && f.latitude != null && f.longitude != null
            ? Math.round(haversineKm(lat, lng, f.latitude, f.longitude) * 10) / 10
            : null,
      };
    });

    if (q) {
      list = list.filter((f) => f.stall_name.toLowerCase().includes(q));
    }
    if (marketId) {
      list = list.filter((f) => f.markets.some((m) => m.market_id === Number(marketId)));
    }
    if (day) {
      const d = Number(day) as DayOfWeek;
      list = list.filter((f) => f.operating_days.includes(d));
    }
    if (categoryId) {
      const cat = Number(categoryId);
      list = list.filter((f) =>
        products.some((p) => p.farmer.id === f.id && p.category.id === cat),
      );
    }
    if (ordering === 'rating') {
      list = [...list].sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0));
    } else if (ordering === 'in_stock') {
      list = [...list].sort(
        (a, b) => b.in_stock_product_count - a.in_stock_product_count,
      );
    } else if (ordering === 'distance' && hasCoords) {
      list = [...list].sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
    } else if (ordering === 'name_desc') {
      list = [...list].sort((a, b) => b.stall_name.localeCompare(a.stall_name));
    } else {
      list = [...list].sort((a, b) => a.stall_name.localeCompare(b.stall_name));
    }

    return HttpResponse.json(envelope(paginate(list, page, page_size)));
  }),

  http.get('/api/farmers/:id/', ({ params }) => {
    const id = numParam(params.id);
    const farmer = farmers.find((f) => f.id === id);
    if (!farmer) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    const { favorite_count, ...pub } = farmer;
    void favorite_count;
    return HttpResponse.json(envelope(pub));
  }),

  http.get('/api/farmers/:id/pickup-options/', ({ params }) => {
    const id = numParam(params.id);
    return HttpResponse.json(envelope(pickupOptions[id] ?? []));
  }),

  http.get('/api/farmers/:id/reviews/', ({ params, request }) => {
    const id = numParam(params.id);
    const { page, page_size } = pageParams(new URL(request.url));
    const list = reviews.filter(
      (r) =>
        (r.type === 'FARMER' && id === 2 && r.id === 1) ||
        (r.type === 'PRODUCT' &&
          r.product != null &&
          products.some((p) => p.id === r.product?.id && p.farmer.id === id)),
    );
    return HttpResponse.json(envelope(reviewsPage(list, page, page_size)));
  }),

  http.get('/api/products/', ({ request }) => {
    const user = getUserByAccess(request.headers.get('Authorization'));
    if (user?.role === 'FARMER') {
      return forwardFarmer(request, '/api/__farmer_only/products/');
    }
    const url = new URL(request.url);
    const { page, page_size } = pageParams(url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const marketId = url.searchParams.get('market_id');
    const farmerId = url.searchParams.get('farmer_id');
    const categoryIds = (url.searchParams.get('category') ?? '')
      .split(',')
      .filter(Boolean)
      .map(Number);
    const ids = (url.searchParams.get('ids') ?? '')
      .split(',')
      .filter(Boolean)
      .map(Number);
    const minPrice = url.searchParams.get('price_min');
    const maxPrice = url.searchParams.get('price_max');
    const day = url.searchParams.get('day');
    const inStock = url.searchParams.get('in_stock');
    const ordering = url.searchParams.get('ordering') ?? 'newest';

    let list: ProductCard[] = products.map(toProductCard);

    if (ids.length) {
      list = list.filter((p) => ids.includes(p.id));
      return HttpResponse.json(envelope(list));
    }
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q));
    if (marketId) {
      list = list.filter((p) =>
        products
          .find((full) => full.id === p.id)
          ?.markets.some((m) => m.market_id === Number(marketId)),
      );
    }
    if (farmerId) list = list.filter((p) => p.farmer.id === Number(farmerId));
    if (categoryIds.length) {
      list = list.filter((p) => categoryIds.includes(p.category.id));
    }
    if (day) {
      const d = Number(day) as DayOfWeek;
      list = list.filter((p) =>
        products
          .find((full) => full.id === p.id)
          ?.markets.some((m) => m.days.includes(d)),
      );
    }
    if (minPrice) {
      list = list.filter((p) => moneyToNumber(p.price) >= Number(minPrice));
    }
    if (maxPrice) {
      list = list.filter((p) => moneyToNumber(p.price) <= Number(maxPrice));
    }
    if (inStock === 'true') {
      list = list.filter((p) => p.availability === 'IN_STOCK');
    }

    if (ordering === 'price_asc') {
      list = [...list].sort((a, b) => moneyToNumber(a.price) - moneyToNumber(b.price));
    } else if (ordering === 'price_desc') {
      list = [...list].sort((a, b) => moneyToNumber(b.price) - moneyToNumber(a.price));
    } else if (ordering === 'rating') {
      list = [...list].sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0));
    } else {
      list = [...list].sort((a, b) => b.id - a.id);
    }

    return HttpResponse.json(envelope(paginate(list, page, page_size)));
  }),

  http.get('/api/products/:id/', ({ params, request }) => {
    const user = getUserByAccess(request.headers.get('Authorization'));
    if (user?.role === 'FARMER') {
      return forwardFarmer(
        request,
        `/api/__farmer_only/products/${numParam(params.id)}/`,
      );
    }
    const id = numParam(params.id);
    const product = products.find((p) => p.id === id);
    if (!product) {
      return HttpResponse.json(errorEnvelope('Not found', 'NOT_FOUND'), {
        status: 404,
      });
    }
    return HttpResponse.json(envelope(product));
  }),

  http.get('/api/products/:id/reviews/', ({ params, request }) => {
    const id = numParam(params.id);
    const { page, page_size } = pageParams(new URL(request.url));
    const list = reviews.filter((r) => r.type === 'PRODUCT' && r.product?.id === id);
    return HttpResponse.json(envelope(reviewsPage(list, page, page_size)));
  }),

  http.post('/api/chat/messages/', async ({ request }) => {
    const body = (await request.json()) as {
      messages?: Array<{ role: string; content: string }>;
    };
    const last = body.messages?.[body.messages.length - 1]?.content ?? '';
    return HttpResponse.json(
      envelope({
        reply: `Mock AI: try searching for "${last || 'vegetables'}" at the nearest market.`,
        tools_used: ['search_products'],
      }),
    );
  }),
];
