import { Link, useParams } from 'react-router-dom';

import { useFarmerOrder } from '@/features/farmer/hooks/useFarmerOrders';
import { Countdown } from '@/components/common/Countdown';
import { EmptyState } from '@/components/feedback/EmptyState';
import { OrderTimeline } from '@/features/customer/components/OrderTimeline';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { FarmerOrderActions } from '@/features/farmer/components/FarmerOrderActions';
import { Button } from '@/components/ui/Button';
import { formatDateTime, formatVnd } from '@/utils/formatters';

import './FarmerOrderDetailPage.css';

export default function FarmerOrderDetailPage() {
  const { id = '' } = useParams();
  const query = useFarmerOrder(id);

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Không tìm thấy đơn"
        actionLabel="Thử lại"
        onAction={() => query.refetch()}
      />
    );
  }

  const order = query.data;

  return (
    <div className="page-primitive__stack-6">
      <PageHeader
        title={`#${order.id}`}
        description={`${order.customer.full_name} · ${order.customer.phone}`}
        actions={<StatusBadge status={order.status} />}
      />

      <FarmerOrderActions order={order} size="default" />

      <OrderTimeline status={order.status} />

      <div className="page-primitive__grid-2-md">
        <div className="page-primitive__panel">
          <h2 className="page-primitive__heading farmer-order-detail__heading">
            Nhận hàng
          </h2>
          <p className="page-primitive__muted-sm">{order.market.name}</p>
          <p className="page-primitive__muted-sm">{order.stall_label}</p>
          <p className="page-primitive__muted-sm farmer-order-detail__countdown--sm">
            {formatDateTime(order.pickup_start_at)} –{' '}
            {formatDateTime(order.pickup_end_at)}
          </p>
          <Countdown
            className="farmer-order-detail__countdown"
            targetIso={order.pickup_start_at}
            label="Đến giờ nhận"
          />
          <Countdown
            className="farmer-order-detail__countdown--sm"
            targetIso={order.cutoff_at}
            label="Cut-off"
          />
        </div>
        <div className="page-primitive__panel">
          <h2 className="page-primitive__heading farmer-order-detail__heading">
            Ghi chú
          </h2>
          <p className="page-primitive__muted-sm">{order.note || 'Không có ghi chú'}</p>
        </div>
      </div>

      <div className="farmer-order-detail__items">
        <ul>
          {order.items.map((item) => (
            <li key={item.product_id} className="farmer-order-detail__item">
              <div>
                <p className="farmer-order-detail__item-name">{item.product_name}</p>
                <p className="page-primitive__muted-sm">
                  {item.quantity} × {formatVnd(item.unit_price)}/{item.unit}
                </p>
              </div>
              <p className="farmer-order-detail__item-total">
                {formatVnd(item.line_total)}
              </p>
            </li>
          ))}
        </ul>
        <div className="farmer-order-detail__total">
          <span>Tổng</span>
          <span>{formatVnd(order.total_amount)}</span>
        </div>
      </div>

      <Button asChild variant="outline">
        <Link to="/farmer/orders">← Danh sách đơn</Link>
      </Button>
    </div>
  );
}
