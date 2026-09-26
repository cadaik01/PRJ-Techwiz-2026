import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

import { PageHeader } from '@/components/common/layout/PageHeader';
import { StatusBadge } from '@/components/common/badges/StatusBadge';
import { Button } from '@/components/common/forms/Button';
import { formatDateTime, formatVnd } from '@/utils/formatters';

import './OrderSuccessPage.css';

function isOrderSummary(value         )                        {
  if (!value || typeof value !== 'object') return false;
  return 'id' in value && typeof value.id === 'number';
}

function isSuccessState(value         )                        {
  if (!value || typeof value !== 'object') return false;
  if (!('orders' in value) || !Array.isArray(value.orders)) return false;
  return value.orders.every(isOrderSummary);
}

function confettiPosClass(index        ) {
  const pos = index % 10;
  return `order-success-page__confetti--pos-${pos}`;
}

function confettiColorClass(index        ) {
  const mod = index % 3;
  if (mod === 0) return 'order-success-page__confetti--primary';
  if (mod === 1) return 'order-success-page__confetti--accent';
  return 'order-success-page__confetti--info';
}

export default function OrderSuccessPage() {
  const location = useLocation();
  const orders = isSuccessState(location.state) ? location.state.orders : [];

  const pieces = useMemo(
    () =>
      Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        posClass: confettiPosClass(i),
        colorClass: confettiColorClass(i),
        delay: (i % 5) * 0.08,
      })),
    [],
  );

  useEffect(() => {
    document.title = 'Pre-order confirmed · MarketLink';
  }, []);

  return (
    <div className="order-success-page">
      <div className="order-success-page__confetti-layer" aria-hidden>
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            className={`order-success-page__confetti ${p.posClass} ${p.colorClass}`}
            initial={{ y: -20, opacity: 1 }}
            animate={{ y: 420, opacity: 0, rotate: 180 }}
            transition={{ duration: 1.8, delay: p.delay, ease: 'easeOut' }}
          />
        ))}
      </div>

      <div className="order-success-page__hero page-primitive__max-w-2xl page-primitive__center-col">
        <CheckCircle2 className="order-success-page__hero-icon" />
        <PageHeader
          className="order-success-page__header"
          title="Pre-order confirmed"
          description={`${orders.length} order${orders.length === 1 ? '' : 's'} ready. Pay when you collect at the stall.`}
        />
      </div>

      <div className="order-success-page__orders page-primitive__max-w-2xl">
        {orders.map((order) => (
          <div key={order.id} className="order-success-page__order-card">
            <div className="page-primitive__row-start">
              <div>
                <p className="order-success-page__order-id">#{order.id}</p>
                <p className="page-primitive__muted-sm">
                  {order.farmer.stall_name} · {order.market.name}
                </p>
                <p className="page-primitive__mt-1 page-primitive__muted-sm">
                  {formatDateTime(order.pickup_start_at)}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <p className="order-success-page__order-amount">
              {formatVnd(order.total_amount)}
            </p>
          </div>
        ))}
      </div>

      <div className="order-success-page__actions page-primitive__max-w-2xl page-primitive__justify-center-row">
        <Button asChild variant="outline">
          <Link to="/app/orders">View my orders</Link>
        </Button>
        <Button asChild>
          <Link to="/products">Keep shopping</Link>
        </Button>
      </div>
    </div>
  );
}
