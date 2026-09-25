import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { useCheckout } from '@/features/customer/hooks/useCheckout';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import {
  TimeSlotPicker,
  type SelectedSlot,
} from '@/features/customer/components/TimeSlotPicker';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { formatVnd } from '@/utils/formatters';
import { useCartStore } from '@/stores/cart.store';
import { usePublicConfigData } from '@/features/catalog/hooks/usePublicConfig';
import { moneyToNumber, type CreateOrderErrorDetail } from '@/types';
import './CheckoutPage.css';

function readCreateOrderDetails(data: unknown): CreateOrderErrorDetail[] {
  if (!data || typeof data !== 'object' || !('details' in data)) return [];
  const details = data.details;
  if (!Array.isArray(details)) return [];
  const out: CreateOrderErrorDetail[] = [];
  for (const item of details) {
    if (!item || typeof item !== 'object') continue;
    if (!('code' in item) || !('message' in item)) continue;
    if (typeof item.code !== 'string' || typeof item.message !== 'string') continue;
    const detail: CreateOrderErrorDetail = {
      code: item.code,
      message: item.message,
    };
    if ('farmer_id' in item && typeof item.farmer_id === 'number') {
      detail.farmer_id = item.farmer_id;
    }
    if ('product_id' in item && typeof item.product_id === 'number') {
      detail.product_id = item.product_id;
    }
    if ('pickup_slot_id' in item && typeof item.pickup_slot_id === 'number') {
      detail.pickup_slot_id = item.pickup_slot_id;
    }
    out.push(detail);
  }
  return out;
}

function stepClass(step: number, current: number) {
  if (step === current) return 'checkout-page__step checkout-page__step--active';
  if (step < current) return 'checkout-page__step checkout-page__step--done';
  return 'checkout-page__step';
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const clearFarmer = useCartStore((s) => s.clearFarmer);
  const config = usePublicConfigData();
  const [step, setStep] = useState(1);
  const [slots, setSlots] = useState<Record<number, SelectedSlot | null>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [errorDetails, setErrorDetails] = useState<CreateOrderErrorDetail[]>([]);
  const [errorOpen, setErrorOpen] = useState(false);

  const grouped = useMemo(() => {
    return items.reduce<Record<number, typeof items>>((acc, item) => {
      if (!item.is_available) return acc;
      const list = acc[item.farmer_id] ?? [];
      list.push(item);
      acc[item.farmer_id] = list;
      return acc;
    }, {});
  }, [items]);

  const farmerIds = Object.keys(grouped).map(Number);
  const { pickupQueries, createOrders: createMutation } = useCheckout(farmerIds);

  const total = Object.values(grouped)
    .flat()
    .reduce((sum, i) => sum + moneyToNumber(i.price) * i.quantity, 0);

  const allSlotsSelected = farmerIds.every((id) => slots[id]);

  if (farmerIds.length === 0) {
    return (
      <div>
        <PageHeader title="Đặt hàng" />
        <EmptyState
          title="Không có sản phẩm khả dụng"
          actionLabel="Về giỏ hàng"
          onAction={() => navigate('/app/cart')}
        />
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <PageHeader
        title="Đặt hàng"
        description="Thanh toán khi nhận hàng tại quầy — không thanh toán online."
      />

      <div className="checkout-page__steps">
        {['Xem lại giỏ', 'Chọn khung giờ', 'Xác nhận'].map((label, index) => {
          const n = index + 1;
          return (
            <div key={label} className={stepClass(n, step)}>
              {n}. {label}
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <div className="page-primitive__stack-4">
          {farmerIds.map((farmerId) => (
            <div key={farmerId} className="checkout-page__panel">
              <h3 className="checkout-page__panel-title">
                {grouped[farmerId]?.[0]?.farmer_name}
              </h3>
              <ul className="checkout-page__line-list">
                {grouped[farmerId]?.map((item) => (
                  <li key={item.product_id} className="checkout-page__line-row">
                    <span>
                      {item.quantity}× {item.name}
                    </span>
                    <span>{formatVnd(moneyToNumber(item.price) * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="page-primitive__actions-between">
            <Button variant="outline" asChild>
              <Link to="/app/cart">Quay lại giỏ</Link>
            </Button>
            <Button onClick={() => setStep(2)}>Tiếp tục</Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="checkout-page__farmer-block">
          {farmerIds.map((farmerId, index) => {
            const options = pickupQueries[index]?.data ?? [];
            return (
              <div key={farmerId}>
                <h3 className="checkout-page__farmer-heading">
                  {grouped[farmerId]?.[0]?.farmer_name}
                </h3>
                {pickupQueries[index]?.isLoading ? (
                  <p className="checkout-page__loading-hint">Đang tải khung giờ…</p>
                ) : (
                  <TimeSlotPicker
                    options={options}
                    value={slots[farmerId] ?? null}
                    horizonDays={config.booking_horizon_days}
                    onChange={(value) =>
                      setSlots((prev) => ({ ...prev, [farmerId]: value }))
                    }
                  />
                )}
                <Textarea
                  className="checkout-page__note-field"
                  placeholder="Ghi chú cho quầy (tuỳ chọn)"
                  value={notes[farmerId] ?? ''}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [farmerId]: e.target.value }))
                  }
                />
              </div>
            );
          })}
          <div className="page-primitive__actions-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Quay lại
            </Button>
            <Button disabled={!allSlotsSelected} onClick={() => setStep(3)}>
              Tiếp tục
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="page-primitive__stack-4">
          {farmerIds.map((farmerId) => {
            const slot = slots[farmerId];
            const subtotal =
              grouped[farmerId]?.reduce(
                (s, i) => s + moneyToNumber(i.price) * i.quantity,
                0,
              ) ?? 0;
            return (
              <div key={farmerId} className="checkout-page__panel">
                <h3 className="checkout-page__panel-title">
                  {grouped[farmerId]?.[0]?.farmer_name}
                </h3>
                <p className="checkout-page__slot-label">{slot?.label}</p>
                <p className="checkout-page__subtotal">{formatVnd(subtotal)}</p>
                {notes[farmerId] ? (
                  <p className="checkout-page__note-text">Ghi chú: {notes[farmerId]}</p>
                ) : null}
              </div>
            );
          })}
          <div className="checkout-page__pay-banner">
            Tổng {formatVnd(total)} · <strong>Thanh toán khi nhận hàng tại quầy</strong>
          </div>
          <div className="page-primitive__actions-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Quay lại
            </Button>
            <Button
              loading={createMutation.isPending}
              onClick={() => {
                void createMutation
                  .mutateAsync({
                    groups: farmerIds.map((farmerId) => {
                      const slot = slots[farmerId];
                      if (!slot) {
                        throw new Error('Missing slot');
                      }
                      return {
                        farmer_id: farmerId,
                        pickup_slot_id: slot.pickup_slot_id,
                        pickup_date: slot.pickup_date,
                        note: notes[farmerId],
                        items:
                          grouped[farmerId]?.map((i) => ({
                            product_id: i.product_id,
                            quantity: i.quantity,
                          })) ?? [],
                      };
                    }),
                  })
                  .then((data) => {
                    for (const order of data.orders) {
                      clearFarmer(order.farmer.id);
                    }
                    if (useCartStore.getState().items.length === 0) clear();
                    navigate('/app/orders/success', {
                      replace: true,
                      state: { orders: data.orders },
                    });
                  })
                  .catch((error: unknown) => {
                    const apiError = ApiError.fromUnknown(error);
                    const details = readCreateOrderDetails(apiError.data);
                    if (details.length > 0) {
                      setErrorDetails(details);
                      setErrorOpen(true);
                    } else {
                      toast.error(apiError.friendlyMessage);
                    }
                  });
              }}
            >
              Xác nhận đặt hàng
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Không thể tạo một số đơn</DialogTitle>
            <DialogDescription>
              Kiểm tra sản phẩm hoặc khung giờ bên dưới rồi chỉnh lại giỏ/checkout.
            </DialogDescription>
          </DialogHeader>
          <ul className="checkout-page__error-list">
            {errorDetails.map((err, index) => (
              <li key={`${err.code}-${index}`} className="checkout-page__error-item">
                <p className="page-primitive__heading">{err.message}</p>
                <p className="checkout-page__error-code">{err.code}</p>
              </li>
            ))}
          </ul>
          <Button onClick={() => setErrorOpen(false)}>Đóng và chỉnh sửa</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
