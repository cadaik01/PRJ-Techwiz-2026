import {
  announcements as seedAnnouncements,
  categories as seedCategories,
  farmers as seedFarmers,
  markets as seedMarkets,
  products as seedProducts,
  reviews as seedReviews,
} from '@/mocks/catalog';
import { customerOrders } from '@/mocks/orders';
import { productAvailability } from '@/types';
import type {
  AdminAnnouncement,
  AdminCategory,
  AdminCustomer,
  AdminFarmerDetail,
  AdminFarmerSummary,
  AdminMarket,
  AuditLogItem,
  FarmerProduct,
  FarmerStatus,
  ModerationProduct,
  ModerationReview,
} from '@/types';

function isoDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export type AdminFarmerRecord = AdminFarmerSummary & {
  status_reason: string | null;
  rating_avg: number | null;
  description: string | null;
  image: string | null;
  markets: AdminFarmerDetail['markets'];
  operating_days: AdminFarmerDetail['operating_days'];
  in_stock_product_count: number;
  upcoming_closures: AdminFarmerDetail['upcoming_closures'];
  distance_km: number | null;
  is_favorite: boolean | null;
  contact_person: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  order_cutoff_hours: number;
  pickup_windows: AdminFarmerDetail['pickup_windows'];
  status_history: AdminFarmerDetail['status_history'];
};

function baseFromSeed(
  f: (typeof seedFarmers)[number],
  status: FarmerStatus,
  email: string,
): AdminFarmerRecord {
  const open = customerOrders.filter(
    (o) =>
      o.farmer.id === f.id &&
      (o.status === 'PLACED' ||
        o.status === 'ACCEPTED' ||
        o.status === 'READY_FOR_PICKUP'),
  ).length;
  const product_count = seedProducts.filter((p) => p.farmer.id === f.id).length;
  return {
    id: f.id,
    stall_name: f.stall_name,
    email,
    phone: f.phone,
    status,
    status_reason: null,
    contact_person: f.contact_person ?? f.stall_name,
    date_joined: isoDays(-40),
    open_order_count: open,
    product_count,
    rating_avg: f.rating_avg,
    description: f.description,
    image: f.image,
    markets: f.markets,
    operating_days: f.operating_days,
    in_stock_product_count: f.in_stock_product_count,
    upcoming_closures: f.upcoming_closures,
    distance_km: f.distance_km,
    is_favorite: f.is_favorite,
    address: f.address,
    latitude: f.latitude,
    longitude: f.longitude,
    order_cutoff_hours: f.order_cutoff_hours,
    pickup_windows: f.pickup_windows,
    status_history: [
      {
        from_status: 'PENDING',
        to_status: status,
        reason: status === 'APPROVED' ? 'Valid profile' : null,
        changed_at: isoDays(-35),
        changed_by: 'admin@demo.vn',
      },
    ],
  };
}

export let adminFarmers: AdminFarmerRecord[] = [
  baseFromSeed(seedFarmers[0], 'APPROVED', 'farmer@demo.vn'),
  baseFromSeed(seedFarmers[1], 'APPROVED', 'xoai@demo.vn'),
  baseFromSeed(seedFarmers[2], 'APPROVED', 'ga@demo.vn'),
  baseFromSeed(seedFarmers[3], 'APPROVED', 'sua@demo.vn'),
  baseFromSeed(seedFarmers[4], 'APPROVED', 'rau@demo.vn'),
  {
    id: 201,
    stall_name: 'Thu Duc Greens Stall',
    email: 'mai.pending@demo.vn',
    phone: '0909111222',
    status: 'PENDING',
    status_reason: null,
    date_joined: isoDays(-2),
    open_order_count: 0,
    product_count: 0,
    rating_avg: null,
    description: 'Grows clean greens in the eastern area; wants to join the Thu Duc market session.',
    image: null,
    markets: [],
    operating_days: [],
    in_stock_product_count: 0,
    upcoming_closures: [],
    distance_km: null,
    is_favorite: null,
    contact_person: 'Thanh Mai',
    address: 'Thu Duc City',
    latitude: null,
    longitude: null,
    order_cutoff_hours: 12,
    pickup_windows: [],
    status_history: [
      {
        from_status: null,
        to_status: 'PENDING',
        reason: 'New registration',
        changed_at: isoDays(-2),
        changed_by: 'system',
      },
    ],
  },
  {
    id: 202,
    stall_name: 'Strawberry Stall',
    email: 'dau.pending@demo.vn',
    phone: '0912333444',
    status: 'PENDING',
    status_reason: null,
    date_joined: isoDays(-1),
    open_order_count: 0,
    product_count: 0,
    rating_avg: null,
    description: 'Greenhouse Da Lat strawberries, delivered to the stall early morning.',
    image: null,
    markets: [],
    operating_days: [],
    in_stock_product_count: 0,
    upcoming_closures: [],
    distance_km: null,
    is_favorite: null,
    contact_person: 'Hoang Nam',
    address: 'Da Lat',
    latitude: null,
    longitude: null,
    order_cutoff_hours: 12,
    pickup_windows: [],
    status_history: [
      {
        from_status: null,
        to_status: 'PENDING',
        reason: 'New registration',
        changed_at: isoDays(-1),
        changed_by: 'system',
      },
    ],
  },
];

export function setAdminFarmers(next: AdminFarmerRecord[]) {
  adminFarmers = next;
}

export function pushFarmerHistory(
  farmer: AdminFarmerRecord,
  to: FarmerStatus,
  reason: string | null,
): AdminFarmerRecord {
  return {
    ...farmer,
    status: to,
    status_reason:
      to === 'REJECTED' || to === 'SUSPENDED' ? reason : farmer.status_reason,
    status_history: [
      {
        from_status: farmer.status,
        to_status: to,
        reason,
        changed_at: new Date().toISOString(),
        changed_by: 'admin@demo.vn',
      },
      ...farmer.status_history,
    ],
  };
}

export let adminCustomers: AdminCustomer[] = [
  {
    id: 1,
    email: 'customer@demo.vn',
    full_name: 'Minh An',
    phone: '0901234567',
    is_active: true,
    deactivation_reason: null,
    total_orders: 5,
    open_orders: 0,
    no_show_count: 0,
    at_risk: false,
    date_joined: isoDays(-60),
  },
  {
    id: 20,
    email: 'hoa@demo.vn',
    full_name: 'Tran Hoa',
    phone: '0909888777',
    is_active: true,
    deactivation_reason: null,
    total_orders: 8,
    open_orders: 0,
    no_show_count: 2,
    at_risk: false,
    date_joined: isoDays(-45),
  },
  {
    id: 21,
    email: 'binh@demo.vn',
    full_name: 'Le Binh',
    phone: '0911222333',
    is_active: false,
    deactivation_reason: null,
    total_orders: 3,
    open_orders: 0,
    no_show_count: 5,
    at_risk: true,
    date_joined: isoDays(-30),
  },
];

export function setAdminCustomers(next: AdminCustomer[]) {
  adminCustomers = next;
}

export let adminMarkets: AdminMarket[] = seedMarkets.map((m) => ({
  ...m,
  is_active: m.id !== 5,
  open_order_count: customerOrders.filter(
    (o) =>
      o.market.id === m.id &&
      (o.status === 'PLACED' ||
        o.status === 'ACCEPTED' ||
        o.status === 'READY_FOR_PICKUP'),
  ).length,
  created_at: isoDays(-90),
  updated_at: isoDays(-1),
}));

export function setAdminMarkets(next: AdminMarket[]) {
  adminMarkets = next;
}

export let adminCategories: AdminCategory[] = seedCategories.map((c) => ({
  ...c,
  is_active: true,
  product_count: seedProducts.filter((p) => p.category.id === c.id).length,
}));

export function setAdminCategories(next: AdminCategory[]) {
  adminCategories = next;
}

export let moderationProducts: ModerationProduct[] = seedProducts
  .slice(0, 6)
  .map((p) => ({
    id: p.id,
    name: p.name,
    farmer: { id: p.farmer.id, stall_name: p.farmer.stall_name },
    image: p.image,
    is_hidden_by_admin: false,
    hidden_reason: null,
    created_at: isoDays(-20),
  }));

export function setModerationProducts(next: ModerationProduct[]) {
  moderationProducts = next;
}

export let moderationReviews: ModerationReview[] = seedReviews.map((r) => ({
  id: r.id,
  rating: r.rating,
  comment: r.comment,
  customer_display_name: r.customer_display_name,
  type: r.type,
  product: r.type === 'FARMER' ? null : (r.product ?? null),
  order_id: r.id,
  reply: null,
  replied_at: null,
  is_hidden_by_admin: false,
  hidden_reason: null,
  created_at: r.created_at,
}));

export function setModerationReviews(next: ModerationReview[]) {
  moderationReviews = next;
}

export let adminAnnouncements: AdminAnnouncement[] = seedAnnouncements.map((a) => ({
  ...a,
  is_active: true,
  created_by_name: 'Administrator',
  created_at: isoDays(-30),
  updated_at: isoDays(-30),
}));

export function setAdminAnnouncements(next: AdminAnnouncement[]) {
  adminAnnouncements = next;
}

export let auditLogs: AuditLogItem[] = [
  {
    id: 1,
    user: { id: 3, email: 'admin@demo.vn' },
    action: 'FARMER_APPROVED',
    endpoint: '/api/admin/farmers/2/approve/',
    method: 'POST',
    ip_address: '127.0.0.1',
    user_agent: 'msw',
    status_code: 200,
    request_id: 'req-1',
    details: { stall_name: 'Da Lat Greens Stall' },
    created_at: isoDays(-35),
  },
  {
    id: 2,
    user: { id: 3, email: 'admin@demo.vn' },
    action: 'CUSTOMER_DEACTIVATED',
    endpoint: '/api/admin/customers/21/deactivate/',
    method: 'POST',
    ip_address: '127.0.0.1',
    user_agent: 'msw',
    status_code: 200,
    request_id: 'req-2',
    details: { reason: 'Multiple no-shows', no_show_count: 5 },
    created_at: isoDays(-5),
  },
  {
    id: 3,
    user: { id: 3, email: 'admin@demo.vn' },
    action: 'MARKET_DEACTIVATED',
    endpoint: '/api/admin/markets/5/',
    method: 'PATCH',
    ip_address: '127.0.0.1',
    user_agent: 'msw',
    status_code: 200,
    request_id: 'req-3',
    details: { name: 'Dong Ba Market' },
    created_at: isoDays(-3),
  },
];

export function pushAudit(entry: Omit<AuditLogItem, 'id' | 'created_at'>) {
  auditLogs = [
    {
      ...entry,
      id: Math.floor(Math.random() * 100000) + 100,
      created_at: new Date().toISOString(),
    },
    ...auditLogs,
  ];
}

export function toFarmerSummary(f: AdminFarmerRecord): AdminFarmerSummary {
  return {
    id: f.id,
    stall_name: f.stall_name,
    contact_person: f.contact_person,
    phone: f.phone,
    email: f.email,
    status: f.status,
    date_joined: f.date_joined,
    product_count: f.product_count,
    open_order_count: f.open_order_count,
  };
}

function toAdminFarmerProduct(p: (typeof seedProducts)[number]): FarmerProduct {
  const now = isoDays(-15);
  return {
    ...p,
    availability: productAvailability(p.stock_quantity, p.is_available),
    weekly_default_quantity: null,
    held_quantity: 0,
    pending_quantity: 0,
    is_archived: false,
    is_hidden_by_admin: false,
    hidden_reason: null,
    created_at: now,
    updated_at: now,
  };
}

export function toFarmerDetail(f: AdminFarmerRecord): AdminFarmerDetail {
  const products = seedProducts
    .filter((p) => p.farmer.id === f.id)
    .map(toAdminFarmerProduct);
  const orders = customerOrders.filter((o) => o.farmer.id === f.id);
  return {
    id: f.id,
    stall_name: f.stall_name,
    image: f.image,
    rating_avg: f.rating_avg,
    rating_count: f.rating_avg != null ? 10 : 0,
    markets: f.markets,
    operating_days: f.operating_days,
    in_stock_product_count: f.in_stock_product_count,
    upcoming_closures: f.upcoming_closures,
    distance_km: f.distance_km,
    is_favorite: f.is_favorite,
    contact_person: f.contact_person,
    phone: f.phone ?? '',
    address: f.address,
    description: f.description,
    latitude: f.latitude,
    longitude: f.longitude,
    order_cutoff_hours: f.order_cutoff_hours,
    pickup_windows: f.pickup_windows,
    email: f.email,
    status: f.status,
    status_reason: f.status_reason,
    products,
    order_stats: {
      total: orders.length,
      completed: orders.filter((o) => o.status === 'COMPLETED').length,
      declined: orders.filter((o) => o.status === 'DECLINED').length,
      expired: orders.filter((o) => o.status === 'EXPIRED').length,
      no_show: orders.filter((o) => o.status === 'NO_SHOW').length,
    },
    status_history: f.status_history,
  };
}
