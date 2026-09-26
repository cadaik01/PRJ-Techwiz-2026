import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import {
  useCancelOrder,
  useCustomerOrder,
} from '../../hooks/queries/customer/useCustomerOrders';
import { ConfirmDialog } from '@/components/common/modal/ConfirmDialog';
import { Countdown } from '@/components/common/badges/Countdown';
import { EmptyState } from '@/components/common/feedback/EmptyState';
import { OrderTimeline } from '../../components/customer/OrderTimeline';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { StatusBadge } from '@/components/common/badges/StatusBadge';
import { Button } from '@/components/common/forms/Button';
import { Textarea } from '@/components/common/forms/Textarea';
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
        title="This order could not be found"
        actionLabel="Try again"
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
          <h2 className="order-detail-page__panel-title">Pickup details</h2>
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
            label="Pickup time"
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
              <ExternalLink className="order-detail-page__directions-icon" /> Directions
            </a>
          </Button>
        </div>

        <div className="order-detail-page__panel order-detail-page__qr-panel">
          <img src={qrUrl} alt={`QR ${orderLabel}`} className="order-detail-page__qr" />
          <p className="order-detail-page__qr-label">{orderLabel}</p>
          <p className="order-detail-page__qr-hint">
            Show this code at the stall when you collect
          </p>
        </div>
      </div>

      <div className="order-detail-page__panel">
        <h2 className="order-detail-page__panel-title">Items</h2>
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
          <p className="order-detail-page__note">Note: {order.note}</p>
        ) : null}
      </div>

      <div className="order-detail-page__actions">
        {canEdit ? (
          <Button asChild variant="secondary">
            <Link to={`/app/orders/${order.id}/edit`}>Edit order</Link>
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="destructive" onClick={() => setCancelOpen(true)}>
            Cancel order
          </Button>
        ) : null}
        {canReview ? (
          <Button asChild>
            <Link to={`/app/orders/${order.id}/review`}>Review</Link>
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => navigate('/app/orders')}>
          Order list
        </Button>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this pre-order"
        description="Tell us why you are cancelling (up to 500 characters)."
        confirmLabel="Confirm cancel"
        destructive
        loading={cancelMutation.isPending}
        onConfirm={() => {
          if (!reason.trim() || reason.length > 500) {
            toast.error('Invalid cancellation reason');
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
          placeholder="e.g. Schedule conflict…"
        />
      </ConfirmDialog>
    </div>
  );
}
