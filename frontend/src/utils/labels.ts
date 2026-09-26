import type { AnnouncementAudience, FarmerStatus, OrderStatus } from '@/types';

// One place for every enum the API sends and a person has to read. Screens import from here
// instead of printing the raw value, which is how READY_FOR_PICKUP ended up on a chart legend.

const ORDER_STATUS: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  ACCEPTED: 'Accepted',
  READY_FOR_PICKUP: 'Ready for pickup',
  COMPLETED: 'Completed',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  NO_SHOW: 'No-show',
};

const FARMER_STATUS: Record<FarmerStatus, string> = {
  PENDING: 'Awaiting approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

const AUDIENCE: Record<AnnouncementAudience, string> = {
  ALL: 'Everyone',
  CUSTOMER: 'Shoppers',
  FARMER: 'Farmers',
};

// Each lookup falls back to sentence-cased words: an enum value added on the API side later
// still reads as English here rather than as SHOUTING_SNAKE.
function humanise(value: string): string {
  const words = value.replaceAll('_', ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function orderStatusLabel(status: OrderStatus | string): string {
  return ORDER_STATUS[status as OrderStatus] ?? humanise(status);
}

export function farmerStatusLabel(status: FarmerStatus | string): string {
  return FARMER_STATUS[status as FarmerStatus] ?? humanise(status);
}

export function audienceLabel(audience: AnnouncementAudience | string): string {
  return AUDIENCE[audience as AnnouncementAudience] ?? humanise(audience);
}
