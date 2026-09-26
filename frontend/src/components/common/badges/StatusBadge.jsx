import { cn } from '@/lib/cn';

import { orderStatusLabel } from '@/utils/labels';

import './StatusBadge.css';

// Colours only: the wording lives in utils/labels so every screen says the same thing.
const STATUS_MODIFIER                              = {
  PLACED: 'status-badge--placed',
  ACCEPTED: 'status-badge--accepted',
  READY_FOR_PICKUP: 'status-badge--ready',
  COMPLETED: 'status-badge--completed',
  DECLINED: 'status-badge--declined',
  CANCELLED: 'status-badge--cancelled',
  EXPIRED: 'status-badge--expired',
  NO_SHOW: 'status-badge--noshow',
};

export function StatusBadge({
  status,
  className,
}

 ) {
  return (
    <span className={cn('status-badge', STATUS_MODIFIER[status], className)}>
      {orderStatusLabel(status)}
    </span>
  );
}
