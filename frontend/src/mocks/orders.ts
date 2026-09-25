import type {
  NotificationItem,
  OrderAction,
  OrderDetail,
  OrderReviewState,
  OrderStatus,
  OrderSummary,
  StatusHistory,
} from '@/types';
import { moneyToNumber } from '@/types';

const PRODUCT_IMG =
  'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=800&q=80';

function isoDaysFromNow(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function reviewStateFor(status: OrderStatus): OrderReviewState | null {
  if (status === 'COMPLETED') {
    return { farmer_reviewed: false, items_pending_review: [] };
  }
  return null;
}

function actionsFor(status: OrderStatus): OrderAction[] {
  if (status === 'PLACED') return ['CANCEL', 'MODIFY'];
  if (status === 'ACCEPTED') return ['CANCEL'];
  if (status === 'READY_FOR_PICKUP') return [];
  if (status === 'COMPLETED') return ['REORDER', 'REVIEW'];
  if (
    status === 'CANCELLED' ||
    status === 'DECLINED' ||
    status === 'EXPIRED' ||
    status === 'NO_SHOW'
  ) {
    return ['REORDER'];
  }
  return [];
}

function isOverdue(status: OrderStatus, pickupEndAt: string): boolean {
  if (status !== 'ACCEPTED' && status !== 'READY_FOR_PICKUP') return false;
  return new Date(pickupEndAt).getTime() < Date.now();
}

function historyFor(status: OrderStatus, createdAt: string): StatusHistory[] {
  const entries: StatusHistory[] = [
    {
      from_status: null,
      to_status: 'PLACED',
      transition: 'CREATE',
      actor_role: 'CUSTOMER',
      actor_name: 'Customer',
      change_reason: null,
      created_at: createdAt,
    },
  ];
  if (status === 'PLACED') return entries;
  if (status === 'CANCELLED') {
    entries.push({
      from_status: 'PLACED',
      to_status: 'CANCELLED',
      transition: 'CANCEL',
      actor_role: 'CUSTOMER',
      actor_name: 'Customer',
      change_reason: null,
      created_at: createdAt,
    });
    return entries;
  }
  entries.push({
    from_status: 'PLACED',
    to_status: 'ACCEPTED',
    transition: 'ACCEPT',
    actor_role: 'FARMER',
    actor_name: 'Farmer',
    change_reason: null,
    created_at: createdAt,
  });
  if (status === 'ACCEPTED') return entries;
  if (status === 'READY_FOR_PICKUP' || status === 'COMPLETED') {
    entries.push({
      from_status: 'ACCEPTED',
      to_status: 'READY_FOR_PICKUP',
      transition: 'READY',
      actor_role: 'FARMER',
      actor_name: 'Farmer',
      change_reason: null,
      created_at: createdAt,
    });
  }
  if (status === 'COMPLETED') {
    entries.push({
      from_status: 'READY_FOR_PICKUP',
      to_status: 'COMPLETED',
      transition: 'COMPLETE',
      actor_role: 'FARMER',
      actor_name: 'Farmer',
      change_reason: null,
      created_at: createdAt,
    });
  }
  return entries;
}

type MakeOrderInput = Partial<OrderDetail> & Pick<OrderDetail, 'id' | 'status'>;

function makeOrder(partial: MakeOrderInput): OrderDetail {
  const pickupStart = partial.pickup_start_at ?? isoDaysFromNow(2, 8);
  const pickupEnd = partial.pickup_end_at ?? isoDaysFromNow(2, 9);
  const cutoff = partial.cutoff_at ?? isoDaysFromNow(1, 20);
  const createdAt = partial.created_at ?? isoDaysFromNow(-1, 10);
  const stallLabel = partial.stall_label ?? 'Khu rau · Quầy 08';

  const farmer = partial.farmer ?? {
    id: 2,
    stall_name: 'Shop Rau Đà Lạt',
    phone: '0912345678',
  };
  const market = partial.market ?? {
    id: 1,
    name: 'Chợ Bến Thành',
    address: 'Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    latitude: 10.7725,
    longitude: 106.698,
  };
  const customer = partial.customer ?? {
    id: 1,
    full_name: 'Nguyễn Văn Minh',
    phone: '0901234567',
  };

  const items = partial.items ?? [
    {
      id: partial.id * 100 + 1,
      product_id: 2,
      product_name: 'Cà chua bi Đà Lạt',
      unit: 'KG' as const,
      unit_price: '1.80',
      quantity: 2,
      line_total: '3.60',
      product_image: PRODUCT_IMG,
    },
  ];
  const total =
    partial.total_amount ??
    String(items.reduce((sum, i) => sum + moneyToNumber(i.line_total), 0));

  return {
    id: partial.id,
    status: partial.status,
    is_overdue: partial.is_overdue ?? isOverdue(partial.status, pickupEnd),
    version: partial.version ?? 1,
    customer,
    farmer,
    market,
    stall_label: stallLabel,
    pickup_date: partial.pickup_date ?? pickupStart.slice(0, 10),
    pickup_start_at: pickupStart,
    pickup_end_at: pickupEnd,
    cutoff_at: cutoff,
    item_count: partial.item_count ?? items.length,
    total_amount: total,
    created_at: createdAt,
    pickup_slot_id: partial.pickup_slot_id ?? 10,
    note: partial.note ?? null,
    items,
    status_history: partial.status_history ?? historyFor(partial.status, createdAt),
    allowed_actions: partial.allowed_actions ?? actionsFor(partial.status),
    review_state: partial.review_state ?? reviewStateFor(partial.status),
  };
}

export let customerOrders: OrderDetail[] = [
  makeOrder({
    id: 1,
    status: 'READY_FOR_PICKUP',
    pickup_start_at: isoDaysFromNow(0, 8),
    pickup_end_at: isoDaysFromNow(0, 9),
    cutoff_at: isoDaysFromNow(-1, 20),
    total_amount: '3.60',
  }),
  makeOrder({
    id: 2,
    status: 'ACCEPTED',
    farmer: { id: 101, stall_name: 'Shop Xoài', phone: '0909888777' },
    market: {
      id: 2,
      name: 'Chợ Bình Tây',
      address: '57A Tháp Mười, Phường 2, Quận 6, TP. Hồ Chí Minh',
      latitude: 10.7503,
      longitude: 106.6519,
    },
    stall_label: 'Khu trái cây · Quầy 21',
    pickup_slot_id: 30,
    pickup_start_at: isoDaysFromNow(1, 8),
    pickup_end_at: isoDaysFromNow(1, 10),
    cutoff_at: isoDaysFromNow(0, 8),
    total_amount: '6.80',
    items: [
      {
        id: 201,
        product_id: 6,
        product_name: 'Xoài cát Hòa Lộc',
        unit: 'KG',
        unit_price: '3.40',
        quantity: 2,
        line_total: '6.80',
        product_image: PRODUCT_IMG,
      },
    ],
  }),
  makeOrder({
    id: 3,
    status: 'PLACED',
    farmer: { id: 103, stall_name: 'Shop Sữa Tươi', phone: '0987654321' },
    market: {
      id: 3,
      name: 'Chợ nông sản Thủ Đức',
      address: 'Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh',
      latitude: 10.8502,
      longitude: 106.7717,
    },
    stall_label: 'Dãy Bơ sữa · Quầy 07',
    pickup_slot_id: 50,
    pickup_start_at: isoDaysFromNow(3, 7),
    pickup_end_at: isoDaysFromNow(3, 9),
    cutoff_at: isoDaysFromNow(2, 23),
    total_amount: '2.56',
    items: [
      {
        id: 301,
        product_id: 8,
        product_name: 'Sữa tươi thanh trùng',
        unit: 'PIECE',
        unit_price: '1.28',
        quantity: 2,
        line_total: '2.56',
        product_image: PRODUCT_IMG,
      },
    ],
  }),
  makeOrder({
    id: 4,
    status: 'COMPLETED',
    pickup_start_at: isoDaysFromNow(-5, 8),
    pickup_end_at: isoDaysFromNow(-5, 9),
    cutoff_at: isoDaysFromNow(-6, 20),
    total_amount: '1.80',
    farmer: { id: 102, stall_name: 'Shop Gà Ta', phone: '0933111222' },
    stall_label: 'Khu thịt · Quầy 15',
    review_state: { farmer_reviewed: false, items_pending_review: [7] },
    items: [
      {
        id: 401,
        product_id: 7,
        product_name: 'Trứng gà ta',
        unit: 'PACK',
        unit_price: '1.80',
        quantity: 1,
        line_total: '1.80',
        product_image: PRODUCT_IMG,
      },
    ],
  }),
  makeOrder({
    id: 5,
    status: 'CANCELLED',
    pickup_start_at: isoDaysFromNow(-8, 7),
    pickup_end_at: isoDaysFromNow(-8, 9),
  }),
  makeOrder({
    id: 6,
    status: 'PLACED',
    farmer: { id: 2, stall_name: 'Shop Rau Đà Lạt', phone: '0912345678' },
    market: {
      id: 1,
      name: 'Chợ Bến Thành',
      address: 'Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      latitude: 10.7725,
      longitude: 106.698,
    },
    stall_label: 'Khu rau · Quầy 08',
    pickup_start_at: isoDaysFromNow(2, 8),
    pickup_end_at: isoDaysFromNow(2, 9),
    cutoff_at: isoDaysFromNow(1, 20),
    total_amount: '4.32',
    item_count: 2,
    customer: { id: 10, full_name: 'Đỗ Thanh Tùng', phone: '0987654321' },
    items: [
      {
        id: 601,
        product_id: 2,
        product_name: 'Cà chua bi Đà Lạt',
        unit: 'KG',
        unit_price: '1.80',
        quantity: 2,
        line_total: '3.60',
        product_image: PRODUCT_IMG,
      },
      {
        id: 602,
        product_id: 3,
        product_name: 'Cải thìa baby',
        unit: 'BUNCH',
        unit_price: '0.72',
        quantity: 1,
        line_total: '0.72',
        product_image: PRODUCT_IMG,
      },
    ],
  }),
  makeOrder({
    id: 7,
    status: 'ACCEPTED',
    farmer: { id: 2, stall_name: 'Shop Rau Đà Lạt', phone: '0912345678' },
    market: {
      id: 4,
      name: 'Chợ Đà Lạt',
      address: 'Nguyễn Thị Minh Khai, Phường 1, Đà Lạt',
      latitude: 11.9404,
      longitude: 108.4583,
    },
    stall_label: 'Dãy A · Quầy 12',
    pickup_slot_id: 20,
    pickup_start_at: isoDaysFromNow(1, 7),
    pickup_end_at: isoDaysFromNow(1, 9),
    cutoff_at: isoDaysFromNow(0, 12),
    total_amount: '3.60',
    customer: { id: 11, full_name: 'Võ Mỹ Linh', phone: '0977123456' },
  }),
  makeOrder({
    id: 8,
    status: 'ACCEPTED',
    farmer: { id: 2, stall_name: 'Shop Rau Đà Lạt', phone: '0912345678' },
    market: {
      id: 1,
      name: 'Chợ Bến Thành',
      address: 'Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
      latitude: 10.7725,
      longitude: 106.698,
    },
    stall_label: 'Khu rau · Quầy 08',
    pickup_start_at: isoDaysFromNow(-1, 8),
    pickup_end_at: isoDaysFromNow(-1, 9),
    cutoff_at: isoDaysFromNow(-2, 20),
    total_amount: '1.80',
    note: 'Đơn quá hạn — khách chưa đến',
    is_overdue: true,
    customer: { id: 12, full_name: 'Hoàng Đức Anh', phone: '0966555444' },
  }),
  makeOrder({
    id: 9,
    status: 'COMPLETED',
    farmer: { id: 2, stall_name: 'Shop Rau Đà Lạt', phone: '0912345678' },
    pickup_start_at: isoDaysFromNow(-7, 8),
    pickup_end_at: isoDaysFromNow(-7, 9),
    cutoff_at: isoDaysFromNow(-8, 20),
    total_amount: '7.20',
    item_count: 1,
    customer: { id: 13, full_name: 'Ngô Bảo Châu', phone: '0955111222' },
  }),
];

export const customerNotifications: NotificationItem[] = [
  {
    id: 1,
    type: 'ORDER_READY',
    title: 'Đơn #1 sẵn sàng lấy',
    message: 'Shop Rau Đà Lạt đã chuẩn bị xong. Đến nhận trong khung 08:00–09:00.',
    target_url: '/app/orders/1',
    is_read: false,
    read_at: null,
    created_at: isoDaysFromNow(0, 6),
  },
  {
    id: 2,
    type: 'ORDER_ACCEPTED',
    title: 'Đơn #2 đã được xác nhận',
    message: 'Shop Xoài đã nhận đơn của bạn.',
    target_url: '/app/orders/2',
    is_read: false,
    read_at: null,
    created_at: isoDaysFromNow(-1, 14),
  },
  {
    id: 3,
    type: 'ORDER_READY',
    title: 'Nhắc đánh giá đơn #4',
    message: 'Chia sẻ trải nghiệm để giúp nông dân cải thiện dịch vụ.',
    target_url: '/app/orders/4/review',
    is_read: true,
    read_at: isoDaysFromNow(-3, 12),
    created_at: isoDaysFromNow(-4, 12),
  },
];

export function setOrders(next: OrderDetail[]) {
  customerOrders = next;
}

export function bumpOrderVersion(order: OrderDetail): OrderDetail {
  return { ...order, version: order.version + 1 };
}

export function isOpenStatus(status: OrderStatus) {
  return status === 'PLACED' || status === 'ACCEPTED' || status === 'READY_FOR_PICKUP';
}

export function toOrderSummary(order: OrderDetail): OrderSummary {
  return {
    id: order.id,
    status: order.status,
    is_overdue: order.is_overdue,
    version: order.version,
    customer: order.customer,
    farmer: order.farmer,
    market: order.market,
    stall_label: order.stall_label,
    pickup_date: order.pickup_date,
    pickup_start_at: order.pickup_start_at,
    pickup_end_at: order.pickup_end_at,
    cutoff_at: order.cutoff_at,
    item_count: order.item_count,
    total_amount: order.total_amount,
    created_at: order.created_at,
  };
}
