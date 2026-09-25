import { cn } from '@/lib/cn';
import type { OrderStatus } from '@/types';

import './StatusBadge.css';

const STATUS_META: Record<OrderStatus, { label: string; modifier: string }> = {
  PLACED: { label: 'Placed', modifier: 'status-badge--placed' },
  ACCEPTED: { label: 'Accepted', modifier: 'status-badge--accepted' },
  READY_FOR_PICKUP: { label: 'Ready for pickup', modifier: 'status-badge--ready' },
  COMPLETED: { label: 'Completed', modifier: 'status-badge--completed' },
  DECLINED: { label: 'Declined', modifier: 'status-badge--declined' },
  CANCELLED: { label: 'Cancelled', modifier: 'status-badge--cancelled' },
  EXPIRED: { label: 'Expired', modifier: 'status-badge--expired' },
  NO_SHOW: { label: 'No-show', modifier: 'status-badge--noshow' },
};

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span className={cn('status-badge', meta.modifier, className)}>{meta.label}</span>
  );
}
