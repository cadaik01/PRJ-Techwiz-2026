import { Link } from 'react-router-dom';

import { Countdown } from '@/components/common/Countdown';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/Button';
import { formatDateTime, formatVnd } from '@/utils/formatters';
import type { OrderSummary } from '@/types';
import { OPEN_ORDER_STATUSES } from '@/types';

import './OrderCard.css';

export function OrderCard({
  order,
  onReorder,
  canReview = false,
}: {
  order: OrderSummary;
  onReorder?: (id: number) => void;
  canReview?: boolean;
}) {
  const isOpen = OPEN_ORDER_STATUSES.includes(order.status);

  return (
    <article className="order-card">
      <div className="order-card__head">
        <div>
          <Link to={`/app/orders/${order.id}`} className="order-card__id-link">
            #{order.id}
          </Link>
          <p className="order-card__subtitle">
            {order.farmer.stall_name} · {order.market.name}
          </p>
          <p className="order-card__pickup">
            Nhận {formatDateTime(order.pickup_start_at)}
            {order.stall_label ? ` · ${order.stall_label}` : ''}
            {order.is_overdue ? ' · Quá hạn' : ''}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="order-card__foot">
        <div>
          <p className="order-card__amount">{formatVnd(order.total_amount)}</p>
          <p className="order-card__item-count">{order.item_count} sản phẩm</p>
          {isOpen ? (
            <Countdown
              className="order-card__countdown"
              targetIso={order.pickup_start_at}
              label="Đến giờ nhận"
            />
          ) : null}
        </div>
        <div className="order-card__actions">
          <Button asChild size="sm" variant="outline">
            <Link to={`/app/orders/${order.id}`}>Chi tiết</Link>
          </Button>
          {onReorder ? (
            <Button size="sm" variant="secondary" onClick={() => onReorder(order.id)}>
              Đặt lại
            </Button>
          ) : null}
          {canReview ? (
            <Button asChild size="sm">
              <Link to={`/app/orders/${order.id}/review`}>Đánh giá</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
