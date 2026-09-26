import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { useCheckout } from '../../hooks/queries/customer/useCheckout';
import { EmptyState } from '@/components/common/feedback/EmptyState';
import { PageHeader } from '@/components/common/layout/PageHeader';
import {
  TimeSlotPicker,

} from '../../components/customer/TimeSlotPicker';
import { Button } from '@/components/common/forms/Button';
import { Textarea } from '@/components/common/forms/Textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/common/modal/Dialog';
import { formatVnd } from '@/utils/formatters';
import { useCartStore } from '@/stores/cart.store';
import { usePublicConfigData } from '../../hooks/queries/guest/usePublicConfig';

import { moneyToNumber } from '@/utils/helpers/domain';
import './CheckoutPage.css';

function readCreateOrderDetails(data         )                           {
  if (!data || typeof data !== 'object' || !('details' in data)) return [];
  const details = data.details;
  if (!Array.isArray(details)) return [];
  const out                           = [];
  for (const item of details) {
    if (!item || typeof item !== 'object') continue;
    if (!('code' in item) || !('message' in item)) continue;
    if (typeof item.code !== 'string' || typeof item.message !== 'string') continue;
    const detail                         = {
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

function stepClass(step        , current        ) {
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
  const [slots, setSlots] = useState                                     ({});
  const [notes, setNotes] = useState                        ({});
  const [errorDetails, setErrorDetails] = useState                          ([]);
  const [errorOpen, setErrorOpen] = useState(false);

  const grouped = useMemo(() => {
    return items.reduce                              ((acc, item) => {
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
        <PageHeader title="Checkout" />
        <EmptyState
          title="Nothing ready to check out"
          description="Add in-stock produce to your cart, then come back here."
          actionLabel="Back to cart"
          onAction={() => navigate('/app/cart')}
        />
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <PageHeader
        title="Checkout"
        description="Choose a pickup slot and pay at the stall — no online payment."
      />

      <div className="checkout-page__steps">
        {['Review', 'Pickup slot', 'Confirm'].map((label, index) => {
          const n = index + 1;
          return (
            <div key={label} className={stepClass(n, step)}>
              {n}. {label}
            </div>
          );
        })}
      </div>

      {step === 1 ? (
        <div className="checkout-page__panels">
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
          <div className="page-primitive__actions-between checkout-page__panels-actions">
            <Button variant="outline" asChild>
              <Link to="/app/cart">Back to cart</Link>
            </Button>
            <Button onClick={() => setStep(2)}>Continue</Button>
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
                  <p className="checkout-page__loading-hint">Loading pickup slots…</p>
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
                  placeholder="Optional note for the stall"
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
              Back
            </Button>
            <Button disabled={!allSlotsSelected} onClick={() => setStep(3)}>
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="checkout-page__panels">
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
                  <p className="checkout-page__note-text">Note: {notes[farmerId]}</p>
                ) : null}
              </div>
            );
          })}
          <div className="checkout-page__pay-banner checkout-page__panels-banner">
            Total {formatVnd(total)} · <strong>Pay on pickup at the stall</strong>
          </div>
          <div className="page-primitive__actions-between checkout-page__panels-actions">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
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
                  .catch((error         ) => {
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
              Confirm pre-order
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={errorOpen} onOpenChange={setErrorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Some orders could not be created</DialogTitle>
            <DialogDescription>
              Check the products or pickup slots below, then adjust your cart/checkout.
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
          <Button onClick={() => setErrorOpen(false)}>Close and edit</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
