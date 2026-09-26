/** Shared domain types and helpers. */

import type { PaginatedData } from './api.types';

/** Pass 4B shared schemas — backend Downloads SoT */

export type Role = 'CUSTOMER' | 'FARMER' | 'ADMIN';

export type FarmerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'NO_SHOW';

/** 1=Monday … 7=Sunday */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type PageSize = 5 | 10 | 20;

export type Unit = 'KG' | 'BUNCH' | 'PIECE' | 'PACK';

export type ProductAvailability = 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNAVAILABLE';

export type OrderAction =
  | 'MODIFY'
  | 'CANCEL'
  | 'ACCEPT'
  | 'DECLINE'
  | 'READY'
  | 'COMPLETE'
  | 'NO_SHOW'
  | 'REVIEW'
  | 'REORDER';

export type NotificationType =
  | 'ORDER_ACCEPTED'
  | 'ORDER_READY'
  | 'ORDER_DECLINED'
  | 'ORDER_EXPIRED'
  | 'RESTOCK'
  | 'ORDER_PLACED'
  | 'ORDER_MODIFIED'
  | 'ORDER_CANCELLED'
  | 'ORDER_CANCELLED_CUSTOMER_LOCKED'
  | 'ACCOUNT_STATUS_CHANGED'
  | 'MARKET_SCHEDULE_CHANGED';

export type AnnouncementAudience = 'ALL' | 'CUSTOMER' | 'FARMER';

export type ReviewType = 'FARMER' | 'PRODUCT';

export type ActorRole = 'CUSTOMER' | 'FARMER' | 'ADMIN' | 'SYSTEM';

export interface Closure {
  id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface MarketSummary {
  id: number;
  name: string;
  address: string;
  image: string | null;
  latitude: number;
  longitude: number;
  operating_days: DayOfWeek[];
  open_time: string;
  close_time: string;
  upcoming_closures: Closure[];
  farmer_count: number;
  distance_km: number | null;
  is_favorite: boolean | null;
}

export interface Market extends MarketSummary {
  description: string | null;
  map_provider: string;
}

export interface MarketAdmin extends Market {
  is_active: boolean;
  open_order_count: number;
  created_at: string;
  updated_at: string;
}

export interface FarmerMarketRef {
  market_id: number;
  market_name: string;
  stall_label: string | null;
}

export interface FarmerSummary {
  id: number;
  stall_name: string;
  image: string | null;
  rating_avg: number | null;
  rating_count: number;
  markets: FarmerMarketRef[];
  operating_days: DayOfWeek[];
  in_stock_product_count: number;
  upcoming_closures: Closure[];
  distance_km: number | null;
  is_favorite: boolean | null;
}

export interface PickupSlot {
  id: number;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface PickupWindow {
  farmer_market_id: number;
  market_id: number;
  market_name: string;
  stall_label: string | null;
  latitude: number;
  longitude: number;
  slots: PickupSlot[];
}

export interface FarmerPublic extends FarmerSummary {
  contact_person: string;
  phone: string;
  address: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  order_cutoff_hours: number;
  pickup_windows: PickupWindow[];
}

export interface PickupSlotOption {
  pickup_slot_id: number;
  start_time: string;
  end_time: string;
  cutoff_at: string;
  is_bookable: boolean;
}

export interface PickupDateOption {
  date: string;
  day_of_week: DayOfWeek;
  slots: PickupSlotOption[];
}

export interface PickupOption {
  market_id: number;
  market_name: string;
  stall_label: string | null;
  latitude: number;
  longitude: number;
  dates: PickupDateOption[];
}

export interface Category {
  id: number;
  name: string;
  icon: string | null;
  display_order: number;
}

export interface CategoryAdmin extends Category {
  is_active: boolean;
  product_count: number;
}

export interface ProductCategoryRef {
  id: number;
  name: string;
}

export interface ProductFarmerRef {
  id: number;
  stall_name: string;
}

export interface ProductCard {
  id: number;
  name: string;
  image: string | null;
  price: string;
  unit: Unit;
  stock_quantity: number;
  is_available: boolean;
  availability: ProductAvailability;
  category: ProductCategoryRef;
  farmer: ProductFarmerRef;
  rating_avg: number | null;
  rating_count: number;
  is_favorite: boolean | null;
}

export interface ProductMarketRef {
  market_id: number;
  market_name: string;
  days: DayOfWeek[];
}

export interface ProductDetail extends ProductCard {
  description: string | null;
  markets: ProductMarketRef[];
}

export interface FarmerProduct extends ProductDetail {
  weekly_default_quantity: number | null;
  // D-029 v1.8: held is every open ACCEPTED / READY order, pending is the PLACED ones the
  // farmer has not answered yet, shown only for reconciliation.
  held_quantity: number;
  pending_quantity: number;
  is_archived: boolean;
  is_hidden_by_admin: boolean;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface FarmerProductPayload {
  name: string;
  category_id: number;
  price: string;
  unit: Unit;
  stock_quantity: number;
  weekly_default_quantity?: number | null;
  description?: string | null;
  is_available?: boolean;
  image?: string | null;
}

export interface RatingSummary {
  rating_avg: number | null;
  rating_count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface Review {
  id: number;
  type: ReviewType;
  rating: number;
  comment: string | null;
  customer_display_name: string;
  product: { id: number; name: string } | null;
  order_id: number;
  reply: string | null;
  replied_at: string | null;
  is_hidden_by_admin: boolean;
  hidden_reason: string | null;
  created_at: string;
}

export interface ReviewsPage extends PaginatedData<Review> {
  summary: RatingSummary;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  starts_at: string;
  ends_at: string | null;
}

export interface AnnouncementAdmin extends Announcement {
  is_active: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type ProductSort = 'newest' | 'price_asc' | 'price_desc' | 'rating';
export type MarketSort = 'distance' | 'name' | 'name_desc';
export type FarmerSort = 'rating' | 'in_stock' | 'distance' | 'name' | 'name_desc';

export interface OrderParty {
  id: number;
  full_name: string;
  phone: string;
  email?: string;
}

export interface OrderFarmerRef {
  id: number;
  stall_name: string;
  phone: string;
}

export interface OrderMarket {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  unit: Unit;
  unit_price: string;
  quantity: number;
  line_total: string;
  product_image: string | null;
}

export interface OrderReviewState {
  farmer_reviewed: boolean;
  items_pending_review: number[];
}

export interface StatusHistory {
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  transition: string | null;
  actor_role: ActorRole;
  actor_name: string | null;
  change_reason: string | null;
  created_at: string;
}

export interface OrderSummary {
  id: number;
  status: OrderStatus;
  is_overdue: boolean;
  version: number;
  customer: OrderParty;
  farmer: OrderFarmerRef;
  market: OrderMarket;
  stall_label: string | null;
  pickup_date: string;
  pickup_start_at: string;
  pickup_end_at: string;
  cutoff_at: string;
  item_count: number;
  total_amount: string;
  created_at: string;
}

export interface OrderDetail extends OrderSummary {
  pickup_slot_id: number | null;
  note: string | null;
  items: OrderItem[];
  status_history: StatusHistory[];
  allowed_actions: OrderAction[];
  review_state: OrderReviewState | null;
}

export interface CreateOrderGroupPayload {
  farmer_id: number;
  pickup_slot_id: number;
  pickup_date: string;
  note?: string;
  items: Array<{ product_id: number; quantity: number }>;
}

export interface CreateOrdersPayload {
  groups: CreateOrderGroupPayload[];
}

export interface CreateOrdersResult {
  orders: OrderSummary[];
}

export interface CreateOrderErrorDetail {
  farmer_id?: number;
  product_id?: number;
  pickup_slot_id?: number;
  code: string;
  message: string;
}

export interface UpdateOrderPayload {
  items?: Array<{ product_id: number; quantity: number }>;
  pickup_slot_id?: number;
  pickup_date?: string;
  note?: string;
}

export interface ReorderPreview {
  items: Array<{
    product: ProductCard;
    quantity: number;
  }>;
  skipped: Array<{
    product_id: number;
    product_name: string;
    reason: 'OUT_OF_STOCK' | 'UNAVAILABLE';
  }>;
}

export interface CustomerDashboard {
  counts: {
    open: number;
    ready_for_pickup: number;
    completed: number;
    pending_review: number;
  };
  upcoming: OrderSummary[];
  favorite_farmers: FarmerSummary[];
  favorite_markets: MarketSummary[];
  last_order_id: number | null;
  recent_notifications: NotificationItem[];
}

/**
 * UI notification. adaptNotification() maps legacy BE fields
 * (verb → title, payload.message/url → message/target_url).
 */
export interface NotificationItem {
  id: number;
  type: NotificationType | string;
  title: string;
  message: string;
  target_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface UnreadCount {
  unread_count: number;
}

export interface FavoriteIds {
  farmer_ids: number[];
  product_ids: number[];
  market_ids: number[];
}

export interface CustomerProfile {
  full_name: string;
  phone: string;
  address: string;
  email: string;
}

export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  'PLACED',
  'ACCEPTED',
  'READY_FOR_PICKUP',
];

export type FarmerOrderAction = Extract<
  OrderAction,
  'ACCEPT' | 'DECLINE' | 'READY' | 'COMPLETE' | 'NO_SHOW'
>;

/** Farmer list/detail reuse OrderSummary / OrderDetail */
export type FarmerOrderSummary = OrderSummary & {
  allowed_actions: FarmerOrderAction[];
};

export type FarmerOrderDetail = OrderDetail;

export interface FarmerOrderTabCounts {
  pending: number;
  accepted: number;
  ready: number;
  history: number;
  overdue: number;
}

export interface PickingListRow {
  product_id: number;
  product_name: string;
  unit: Unit;
  total_qty: number;
  order_count: number;
}

export interface StockTemplatePreview {
  can_apply: boolean;
  overdue_orders: OrderSummary[];
  changes: Array<{
    product_id: number;
    product_name: string;
    current_stock: number;
    new_stock: number;
    held_quantity: number;
  }>;
}

export interface FarmerMarketMembership {
  id: number;
  market: MarketSummary;
  stall_label: string;
  slots: PickupSlot[];
  open_order_count: number;
}

export interface FarmerProfile extends FarmerPublic {
  email: string;
  status: FarmerStatus;
  status_reason: string | null;
}

export interface FarmerDashboard {
  kpis: {
    total_orders: number;
    pending_approval: number;
    in_progress: number;
    revenue: string;
  };
  revenue_by_day: Array<{ date: string; revenue: string }>;
  top_products: Array<{
    product_id: number;
    name: string;
    quantity_sold: number;
    revenue: string;
  }>;
  overdue_open_count: number;
  upcoming: OrderSummary[];
  status: FarmerStatus;
  status_reason: string | null;
}

export type FarmerReviewItem = Review;

export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatReply {
  reply: string;
  tools_used: string[];
}

export type ChatResponse = ChatReply;

// AD-01. orders_by_day always holds 30 entries and orders_by_status always holds every
// status, zeros included, so the charts keep an unbroken axis.
export interface AdminDashboard {
  totals: {
    farmers: number;
    farmers_pending: number;
    customers: number;
    markets_active: number;
    orders: number;
  };
  orders_by_day: Array<{ date: string; count: number }>;
  orders_by_status: Array<{ status: OrderStatus; count: number }>;
  pending_farmers: AdminFarmerSummary[];
}

// AD-02. product_count counts the live catalogue only: an archived product is a soft
// delete (D-017), so it is not part of a stall's offering any more.
export interface AdminFarmerSummary {
  id: number;
  stall_name: string;
  contact_person: string;
  phone: string;
  email: string;
  status: FarmerStatus;
  date_joined: string;
  product_count: number;
  open_order_count: number;
}

export interface AdminFarmerDetail extends FarmerPublic {
  email: string;
  status: FarmerStatus;
  status_reason: string | null;
  products: FarmerProduct[];
  order_stats: {
    total: number;
    completed: number;
    declined: number;
    expired: number;
    no_show: number;
  };
  status_history: Array<{
    from_status: FarmerStatus | null;
    to_status: FarmerStatus;
    reason: string | null;
    changed_by: string | null;
    changed_at: string;
  }>;
}

// AD-04 and AD-11 share this breakdown. Only the ACCEPTED and READY_FOR_PICKUP orders
// return stock when the admin acts - a PLACED order never took any (D-029).
export interface OpenOrderBreakdown {
  PLACED: number;
  ACCEPTED: number;
  READY_FOR_PICKUP: number;
  total: number;
}

export interface FarmerImpact {
  open_orders: OpenOrderBreakdown;
  affected_customers: number;
}

// AD-09. at_risk is set when the customer has at least AT_RISK_THRESHOLD NO_SHOW orders
// inside the window; EXPIRED never counts, because that is the farmer failing to confirm.
export interface AdminCustomer {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  date_joined: string;
  is_active: boolean;
  deactivation_reason: string | null;
  total_orders: number;
  open_orders: number;
  no_show_count: number;
  at_risk: boolean;
}

// AD-10 adds the address and the ten most recent orders.
export interface AdminCustomerDetail extends AdminCustomer {
  address: string;
  recent_orders: OrderSummary[];
}

export interface CustomerImpact {
  open_orders: OpenOrderBreakdown;
  affected_farmers: number;
}

/** @deprecated Prefer MarketAdmin */
export type AdminMarket = MarketAdmin;

export interface AdminMarketPayload {
  name: string;
  address: string;
  description?: string | null;
  image?: string | null;
  latitude: number;
  longitude: number;
  operating_days: DayOfWeek[];
  open_time: string;
  close_time: string;
}

// AD-31 to AD-33 (D-023). market_closures and farmer_closures share this shape.
export interface MarketClosure {
  id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface MarketClosurePayload {
  start_date: string;
  end_date: string;
  reason?: string;
}

export type AdminCategory = CategoryAdmin;

export interface ModerationProduct {
  id: number;
  name: string;
  farmer: { id: number; stall_name: string };
  image: string | null;
  is_hidden_by_admin: boolean;
  hidden_reason: string | null;
  created_at: string;
}

// AD-22. The backend names the reviewed product instead of a prebuilt label, because a
// farmer review has no product at all - the page builds the label it wants.
export interface ModerationReview {
  id: number;
  type: ReviewType;
  rating: number;
  comment: string | null;
  customer_display_name: string;
  product: { id: number; name: string } | null;
  order_id: number;
  reply: string | null;
  replied_at: string | null;
  is_hidden_by_admin: boolean;
  hidden_reason: string | null;
  created_at: string;
}

// AD-25. Revenue counts COMPLETED orders only, filtered on pickup_date - the day the sale
// actually happens - and arrives as a decimal string (D-020).
export interface AdminReport {
  orders_by_status: Array<{ status: OrderStatus; count: number }>;
  revenue_by_market: Array<{
    market_id: number;
    market_name: string;
    completed_orders: number;
    revenue: string;
  }>;
  top_farmers: Array<{
    farmer_id: number;
    stall_name: string;
    completed_orders: number;
    revenue: string;
    rating_avg: number | null;
  }>;
}

export type AdminAnnouncement = AnnouncementAdmin;

export interface AuditLogItem {
  id: number;
  user: { id: number; email: string } | null;
  action: string;
  endpoint: string | null;
  method: string | null;
  ip_address: string | null;
  user_agent: string | null;
  status_code: number | null;
  request_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

/** Parse API decimal money string (or number) for display/math. */
export function moneyToNumber(amount: string | number): number {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return Number.isFinite(value) ? value : 0;
}

export function productAvailability(
  stock_quantity: number,
  is_available: boolean,
  is_hidden = false,
  is_archived = false,
): ProductAvailability {
  if (is_hidden || is_archived || !is_available) return 'UNAVAILABLE';
  if (stock_quantity <= 0) return 'OUT_OF_STOCK';
  return 'IN_STOCK';
}
