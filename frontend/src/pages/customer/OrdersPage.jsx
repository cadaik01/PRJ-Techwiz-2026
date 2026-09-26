import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  invalidateOrdersList,
  useCustomerOrders,
  useReorderPreview,
} from '@/hooks/queries/customer/useCustomerOrders';
import { EmptyState } from '@/components/common/feedback/EmptyState';
import { OrderCard } from '@/components/customer/OrderCard';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { Button } from '@/components/common/forms/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/common/modal/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/common/layout/Tabs';
import { useCartStore } from '@/stores/cart.store';

import './OrdersPage.css';

export default function OrdersPage() {
  const [tab, setTab] = useState                    ('open');
  const [status, setStatus] = useState                  ('');
  const [preview, setPreview] = useState                       (null);
  const queryClient = useQueryClient();
  const addItem = useCartStore((s) => s.addItem);

  const ordersQuery = useCustomerOrders({
    tab,
    status: status || undefined,
    page_size: 20,
  });

  const reorderMutation = useReorderPreview();

  if (ordersQuery.isLoading) return <PageSkeleton />;

  return (
    <div className="orders-page">
      <PageHeader
        title="Your orders"
        description="Follow open pre-orders and revisit past pickups."
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v === 'history' ? 'history' : 'open')}
      >
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <div className="orders-page__filters">
          <select
            className="orders-page__select"
            value={status}
            onChange={(e) => {
              const value = e.target.value;
              if (
                value === '' ||
                value === 'PLACED' ||
                value === 'ACCEPTED' ||
                value === 'READY_FOR_PICKUP' ||
                value === 'COMPLETED' ||
                value === 'CANCELLED' ||
                value === 'DECLINED' ||
                value === 'EXPIRED' ||
                value === 'NO_SHOW'
              ) {
                setStatus(value);
              }
            }}
          >
            <option value="">All statuses</option>
            <option value="PLACED">Placed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="READY_FOR_PICKUP">Ready for pickup</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="DECLINED">Declined</option>
            <option value="EXPIRED">Expired</option>
            <option value="NO_SHOW">No-show</option>
          </select>
        </div>

        <TabsContent value={tab} className="orders-page__list">
          {ordersQuery.isError ? (
            <EmptyState
              title="Orders couldn't be loaded"
              actionLabel="Try again"
              onAction={() => ordersQuery.refetch()}
            />
          ) : !ordersQuery.data?.results.length ? (
            <EmptyState
              title="No orders here yet"
              description="When you place a pre-order, it will show up in this list."
            />
          ) : (
            ordersQuery.data.results.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onReorder={(orderId) =>
                  reorderMutation.mutate(orderId, {
                    onSuccess: (data) => setPreview(data),
                  })
                }
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order again</DialogTitle>
            <DialogDescription>
              In-stock items go back into your cart. Anything unavailable is skipped.
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="orders-page__preview">
              <div>
                <p className="orders-page__preview-title">
                  Ready to reserve ({preview.items.length})
                </p>
                <ul className="orders-page__preview-list">
                  {preview.items.map((item) => (
                    <li key={item.product.id}>
                      {item.quantity}× {item.product.name}
                    </li>
                  ))}
                </ul>
              </div>
              {preview.skipped.length > 0 ? (
                <div>
                  <p className="orders-page__preview-title orders-page__preview-title--danger">
                    Unavailable ({preview.skipped.length})
                  </p>
                  <ul className="orders-page__preview-list">
                    {preview.skipped.map((item) => (
                      <li key={item.product_id}>
                        {item.product_name} — {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Button
                className="orders-page__preview-btn"
                onClick={() => {
                  for (const item of preview.items) {
                    addItem({
                      product_id: item.product.id,
                      farmer_id: item.product.farmer.id,
                      farmer_name: item.product.farmer.stall_name,
                      name: item.product.name,
                      unit: item.product.unit,
                      price: item.product.price,
                      quantity: item.quantity,
                      image: item.product.image,
                      is_available:
                        item.product.availability === 'IN_STOCK' &&
                        item.product.is_available,
                    });
                  }
                  setPreview(null);
                  void invalidateOrdersList(queryClient);
                  toast.success('Items added to your cart');
                }}
              >
                Add to cart
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
