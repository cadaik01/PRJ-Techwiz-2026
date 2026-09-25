import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  invalidateOrdersList,
  useCustomerOrders,
  useReorderPreview,
} from '@/features/customer/hooks/useCustomerOrders';
import { EmptyState } from '@/components/feedback/EmptyState';
import { OrderCard } from '@/features/customer/components/OrderCard';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useCartStore } from '@/stores/cart.store';
import type { OrderStatus, ReorderPreview } from '@/types';

import './OrdersPage.css';

export default function OrdersPage() {
  const [tab, setTab] = useState<'open' | 'history'>('open');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [preview, setPreview] = useState<ReorderPreview | null>(null);
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
      <PageHeader title="Đơn hàng" description="Theo dõi đơn mở và lịch sử đặt trước." />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v === 'history' ? 'history' : 'open')}
      >
        <TabsList>
          <TabsTrigger value="open">Đang mở</TabsTrigger>
          <TabsTrigger value="history">Lịch sử</TabsTrigger>
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
            <option value="">Tất cả trạng thái</option>
            <option value="PLACED">Đã đặt</option>
            <option value="ACCEPTED">Đã xác nhận</option>
            <option value="READY_FOR_PICKUP">Sẵn sàng lấy</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
            <option value="DECLINED">Từ chối</option>
            <option value="EXPIRED">Hết hạn</option>
            <option value="NO_SHOW">Không đến lấy</option>
          </select>
        </div>

        <TabsContent value={tab} className="orders-page__list">
          {ordersQuery.isError ? (
            <EmptyState
              title="Không tải được đơn"
              actionLabel="Thử lại"
              onAction={() => ordersQuery.refetch()}
            />
          ) : !ordersQuery.data?.results.length ? (
            <EmptyState title="Chưa có đơn nào" />
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
            <DialogTitle>Đặt lại đơn</DialogTitle>
            <DialogDescription>
              Các sản phẩm còn bán sẽ được thêm vào giỏ. Mục không khả dụng sẽ bị bỏ qua.
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="orders-page__preview">
              <div>
                <p className="orders-page__preview-title">
                  Thêm vào giỏ ({preview.items.length})
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
                    Bỏ qua ({preview.skipped.length})
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
                  toast.success('Đã thêm sản phẩm vào giỏ');
                }}
              >
                Thêm vào giỏ
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
