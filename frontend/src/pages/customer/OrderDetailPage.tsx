import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import {
  useCancelOrder,
  useCustomerOrder,
} from '@/features/customer/hooks/useCustomerOrders';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Countdown } from '@/components/common/Countdown';
import { EmptyState } from '@/components/feedback/EmptyState';
import { OrderTimeline } from '@/features/customer/components/OrderTimeline';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { googleMapsDirectionsUrl } from '@/utils/helpers/geo';
import { formatDateTime, formatVnd } from '@/utils/formatters';

import './OrderDetailPage.css';

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const orderQuery = useCustomerOrder(id);
  const cancelMutation = useCancelOrder(id);

  if (orderQuery.isLoading) return <PageSkeleton />;
  if (orderQuery.isError || !orderQuery.data) {
    return (
      <EmptyState
        title="Không tìm thấy đơn"
        actionLabel="Thử lại"
        onAction={() => orderQuery.refetch()}
      />
    );
  }

  const order = orderQuery.data;
  const canCancel = order.allowed_actions.includes('CANCEL');
  const canEdit = order.allowed_actions.includes('MODIFY');
  const canReview = order.allowed_actions.includes('REVIEW');
  const orderLabel = `#${order.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(orderLabel)}`;

  return (
    <div className="order-detail-page">
      <PageHeader
        title={orderLabel}
        description={`${order.farmer.stall_name} · ${order.market.name}`}
        actions={<StatusBadge status={order.status} />}
      />

      <OrderTimeline status={order.status} />

      <div className="order-detail-page__grid">
        <div className="order-detail-page__panel">
          <h2 className="order-detail-page__panel-title">Nhận hàng</h2>
          {order.stall_label ? (
            <p className="order-detail-page__stall">{order.stall_label}</p>
          ) : null}
          <p className="order-detail-page__pickup-time">
            {formatDateTime(order.pickup_start_at)}
          </p>
          <Countdown
            className="order-detail-page__countdown"
            targetIso={order.cutoff_at}
            label="Cut-off"
          />
          <Countdown
            className="order-detail-page__countdown order-detail-page__countdown--tight"
            targetIso={order.pickup_start_at}
            label="Giờ nhận"
          />
          <Button
            asChild
            variant="outline"
            size="sm"
            className="order-detail-page__directions"
          >
            <a
              href={googleMapsDirectionsUrl(
                order.market.latitude,
                order.market.longitude,
              )}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="order-detail-page__directions-icon" /> Chỉ đường
            </a>
          </Button>
        </div>

        <div className="order-detail-page__panel order-detail-page__qr-panel">
          <img src={qrUrl} alt={`QR ${orderLabel}`} className="order-detail-page__qr" />
          <p className="order-detail-page__qr-label">{orderLabel}</p>
          <p className="order-detail-page__qr-hint">Đưa mã này khi nhận tại quầy</p>
        </div>
      </div>

      <div className="order-detail-page__panel">
        <h2 className="order-detail-page__panel-title">Sản phẩm</h2>
        <ul className="order-detail-page__items">
          {order.items.map((item) => (
            <li key={item.id} className="order-detail-page__item-row">
              <span>
                {item.quantity}× {item.product_name}
              </span>
              <span>{formatVnd(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <p className="order-detail-page__total">{formatVnd(order.total_amount)}</p>
        {order.note ? (
          <p className="order-detail-page__note">Ghi chú: {order.note}</p>
        ) : null}
      </div>

      <div className="order-detail-page__actions">
        {canEdit ? (
          <Button asChild variant="secondary">
            <Link to={`/app/orders/${order.id}/edit`}>Sửa đơn</Link>
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>
            Hủy đơn
          </Button>
        ) : null}
        {canReview ? (
          <Button asChild>
            <Link to={`/app/orders/${order.id}/review`}>Đánh giá</Link>
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => navigate('/app/orders')}>
          Danh sách đơn
        </Button>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Hủy đơn hàng"
        description="Nhập lý do hủy (tối đa 500 ký tự)."
        confirmLabel="Xác nhận hủy"
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => {
          if (!reason.trim() || reason.length > 500) {
            toast.error('Lý do hủy không hợp lệ');
            return;
          }
          cancelMutation.mutate(
            { reason, version: order.version },
            {
              onSuccess: () => setCancelOpen(false),
              onError: (error) => {
                const apiError = ApiError.fromUnknown(error);
                toast.error(apiError.friendlyMessage);
                if (apiError.code === 'RESOURCE_MODIFIED') {
                  void orderQuery.refetch();
                }
              },
            },
          );
        }}
      >
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder="Ví dụ: Đổi lịch cá nhân…"
        />
      </ConfirmDialog>
    </div>
  );
}
