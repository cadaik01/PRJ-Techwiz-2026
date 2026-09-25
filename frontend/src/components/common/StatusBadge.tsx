import { cn } from '@/lib/cn';
import type { OrderStatus } from '@/types';

import './StatusBadge.css';

const STATUS_META: Record<OrderStatus, { label: string; modifier: string }> = {
  PLACED: { label: 'Đã đặt', modifier: 'status-badge--placed' },
  ACCEPTED: { label: 'Đã xác nhận', modifier: 'status-badge--accepted' },
  READY_FOR_PICKUP: { label: 'Sẵn sàng lấy', modifier: 'status-badge--ready' },
  COMPLETED: { label: 'Hoàn thành', modifier: 'status-badge--completed' },
  DECLINED: { label: 'Từ chối', modifier: 'status-badge--declined' },
  CANCELLED: { label: 'Đã hủy', modifier: 'status-badge--cancelled' },
  EXPIRED: { label: 'Hết hạn', modifier: 'status-badge--expired' },
  NO_SHOW: { label: 'Không đến lấy', modifier: 'status-badge--noshow' },
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
