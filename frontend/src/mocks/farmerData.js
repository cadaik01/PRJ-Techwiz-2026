import {
  categories,
  farmers,
  markets,
  products,
  pickupOptions,
  reviews,
} from '@/mocks/catalog';

import { productAvailability } from '@/utils/helpers/domain';

function toFarmerProduct(
  p                           ,
  held        ,
  weeklyDefault               ,
)                {
  const now = '2026-09-10T08:00:00+07:00';
  return {
    ...p,
    availability: productAvailability(p.stock_quantity, p.is_available),
    weekly_default_quantity: weeklyDefault,
    held_quantity: held,
    pending_quantity: 0,
    is_archived: false,
    is_hidden_by_admin: false,
    hidden_reason: null,
    created_at: now,
    updated_at: now,
  };
}

const DEMO_FARMER_ID = 2;
const seedFarmer = farmers.find((f) => f.id === DEMO_FARMER_ID);

export let farmerProducts                  = products
  .filter((p) => p.farmer.id === DEMO_FARMER_ID)
  .map((p) =>
    toFarmerProduct(
      p,
      p.id === 2 ? 4 : p.id === 4 ? 2 : 0,
      p.id === 2 ? 50 : p.id === 3 ? 70 : p.id === 4 ? 30 : 40,
    ),
  );

export function setFarmerProducts(next                 ) {
  farmerProducts = next;
}

export function bumpProductVersion(product               )                {
  return {
    ...product,
    updated_at: new Date().toISOString(),
  };
}

/** @deprecated alias */
export const bumpProductEtag = bumpProductVersion;

function slotsFromPickup(option                                        )               {
  const first = option.dates[0];
  return first.slots.map((s) => ({
    id: s.pickup_slot_id,
    day_of_week: first.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time,
    is_active: true,
  }));
}

function buildMemberships()                           {
  const options = pickupOptions[DEMO_FARMER_ID] ?? [];
  const farmerMarkets = seedFarmer?.markets ?? [];
  return farmerMarkets.map((fm, index) => {
    const market = markets.find((m) => m.id === fm.market_id);
    const opt = options.find((o) => o.market_id === fm.market_id);
    const summary = market
      ? {
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
        }
      : {
          id: fm.market_id,
          name: fm.market_name,
          address: '',
          image: null,
          latitude: 0,
          longitude: 0,
          operating_days: []               ,
          open_time: '06:00',
          close_time: '18:00',
          upcoming_closures: [],
          farmer_count: 0,
          distance_km: null,
          is_favorite: null,
        };
    return {
      id: DEMO_FARMER_ID * 100 + index + 1,
      market: summary,
      stall_label: fm.stall_label ?? '',
      slots: opt ? slotsFromPickup(opt) : [],
      open_order_count: 0,
    };
  });
}

export let farmerMarkets                           = buildMemberships();

export function setFarmerMarkets(next                          ) {
  farmerMarkets = next;
}

export let farmerProfile                = {
  id: DEMO_FARMER_ID,
  stall_name: seedFarmer?.stall_name ?? 'Farmer stall',
  image: seedFarmer?.image ?? null,
  rating_avg: seedFarmer?.rating_avg ?? null,
  rating_count: seedFarmer?.rating_count ?? 0,
  markets: seedFarmer?.markets ?? [],
  operating_days: seedFarmer?.operating_days ?? [],
  in_stock_product_count: seedFarmer?.in_stock_product_count ?? 0,
  upcoming_closures: seedFarmer?.upcoming_closures ?? [],
  distance_km: seedFarmer?.distance_km ?? null,
  is_favorite: seedFarmer?.is_favorite ?? null,
  contact_person: seedFarmer?.contact_person ?? 'Lan Huong',
  phone: seedFarmer?.phone ?? '0912345678',
  address: seedFarmer?.address ?? 'Da Lat, Lam Dong',
  description: seedFarmer?.description ?? null,
  latitude: seedFarmer?.latitude ?? null,
  longitude: seedFarmer?.longitude ?? null,
  order_cutoff_hours: seedFarmer?.order_cutoff_hours ?? 12,
  pickup_windows: seedFarmer?.pickup_windows ?? [],
  email: 'farmer@demo.vn',
  status: 'APPROVED',
  status_reason: null,
};

export function setFarmerProfile(next               ) {
  farmerProfile = next;
}

export const farmerReviews                     = reviews.filter((r) => {
  if (r.type === 'PRODUCT' && r.product) {
    return products.some((p) => p.id === r.product?.id && p.farmer.id === DEMO_FARMER_ID);
  }
  if (r.type === 'FARMER') {
    return r.id === 1;
  }
  return false;
});

export function replyFarmerReview(id        , reply        )                          {
  const idx = farmerReviews.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const current = farmerReviews[idx];
  if (current.reply) return null;
  const updated                   = {
    ...current,
    reply,
    replied_at: new Date().toISOString(),
  };
  farmerReviews[idx] = updated;
  return updated;
}

export const farmerNotifications                     = [
  {
    id: 101,
    type: 'ORDER_PLACED',
    title: 'New order #6',
    message: 'Do Thanh Tung placed 3 products — awaiting confirmation.',
    target_url: '/farmer/orders/6',
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 102,
    type: 'ORDER_MODIFIED',
    title: 'Order #8 overdue',
    message: 'Customer did not pick up within the window. Complete the order or mark no-show.',
    target_url: '/farmer/orders/8',
    is_read: false,
    read_at: null,
    created_at: new Date(Date.now() - 3600_000).toISOString(),
  },
];

export function categoryName(id        ) {
  return categories.find((c) => c.id === id)?.name ?? 'Other';
}

export function createEmptySlot(day_of_week           )             {
  return {
    id: Math.floor(Math.random() * 100000) + 1000,
    day_of_week,
    start_time: '08:00',
    end_time: '09:00',
    is_active: true,
  };
}

export { markets as allMarkets, DEMO_FARMER_ID };
