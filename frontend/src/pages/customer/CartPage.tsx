import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/feedback/EmptyState';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { QuantityStepper } from '@/components/common/forms/QuantityStepper';
import { LazyImage } from '@/components/common/cards/LazyImage';
import { PriceTag } from '@/components/common/badges/PriceTag';
import { Button } from '@/components/common/forms/Button';
import { useCartProductRefresh } from '@/hooks/queries/customer/useCheckout';
import { useCustomerOrders } from '@/hooks/queries/customer/useCustomerOrders';
import { usePublicConfigData } from '@/hooks/queries/guest/usePublicConfig';
import { useCartStore } from '@/stores/cart.store';
import { formatVnd } from '@/utils/formatters';
import { moneyToNumber } from '@/types';

import './CartPage.css';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);
  const config = usePublicConfigData();

  const ids = useMemo(() => items.map((i) => i.product_id), [items]);

  const refreshQuery = useCartProductRefresh(ids);

  useEffect(() => {
    if (!refreshQuery.data) return;
    for (const product of refreshQuery.data) {
      const cartItem = items.find((i) => i.product_id === product.id);
      if (!cartItem) continue;
      if (
        cartItem.price !== product.price ||
        cartItem.is_available !== product.is_available
      ) {
        useCartStore.setState({
          items: useCartStore.getState().items.map((i) =>
            i.product_id === product.id
              ? {
                  ...i,
                  price: product.price,
                  is_available: product.is_available && product.stock_quantity > 0,
                }
              : i,
          ),
        });
      }
    }
  }, [refreshQuery.data, items]);

  const openOrdersQuery = useCustomerOrders({ tab: 'open', page_size: 20 });

  const grouped = useMemo(() => {
    return items.reduce<Record<string, typeof items>>((acc, item) => {
      const list = acc[item.farmer_id] ?? [];
      list.push(item);
      acc[item.farmer_id] = list;
      return acc;
    }, {});
  }, [items]);

  const farmerCount = Object.keys(grouped).length;
  const openCount = openOrdersQuery.data?.count ?? 0;
  const maxOpen = config.max_open_orders_total;
  const maxPerFarmer = config.max_open_orders_per_farmer;
  const wouldExceedTotal = openCount + farmerCount > maxOpen;
  const conflictingFarmers = Object.keys(grouped).filter((farmerId) =>
    openOrdersQuery.data?.results.some((o) => o.farmer.id === Number(farmerId)),
  );

  const total = items
    .filter((i) => i.is_available)
    .reduce((sum, i) => sum + moneyToNumber(i.price) * i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="cart-page">
        <PageHeader title="Your cart" />
        <EmptyState
          title="Your cart is empty"
          description="Browse stalls and reserve produce to get started."
          actionLabel="Browse produce"
          onAction={() => {
            window.location.href = '/products';
          }}
        />
      </div>
    );
  }

  return (
    <div className="cart-page">
      <PageHeader
        title="Your cart"
        description="Items from each stall become a separate pre-order at checkout."
        actions={
          <Button variant="outline" size="sm" onClick={() => clear()}>
            Empty cart
          </Button>
        }
      />

      {(wouldExceedTotal || conflictingFarmers.length > 0) && (
        <div className="cart-page__warn">
          <AlertTriangle className="cart-page__warn-icon" />
          <div>
            {wouldExceedTotal ? (
              <p>
                You currently have {openCount} open orders. Adding {farmerCount} more would exceed the
                limit of {maxOpen} open orders.
              </p>
            ) : null}
            {conflictingFarmers.length > 0 ? (
              <p className="cart-page__warn-note">
                You already have an open order with this stall (max {maxPerFarmer}/farmer). Complete
                or cancel the existing order first.
              </p>
            ) : null}
          </div>
        </div>
      )}

      <div className="cart-page__groups">
        {Object.entries(grouped).map(([farmerId, farmerItems]) => {
          const subtotal = farmerItems
            .filter((i) => i.is_available)
            .reduce((sum, i) => sum + moneyToNumber(i.price) * i.quantity, 0);
          return (
            <section key={farmerId} className="cart-page__group">
              <h2 className="cart-page__group-title">{farmerItems[0]?.farmer_name}</h2>
              <ul className="cart-page__items">
                {farmerItems.map((item) => (
                  <li key={item.product_id} className="cart-page__item">
                    {item.image ? (
                      <LazyImage
                        src={item.image}
                        alt=""
                        className="cart-page__item-thumb"
                      />
                    ) : (
                      <div className="cart-page__item-thumb--empty" />
                    )}
                    <div className="cart-page__item-body">
                      <p className="cart-page__item-name">{item.name}</p>
                      <p className="cart-page__item-price">
                        <PriceTag amount={item.price} unit={item.unit} />
                      </p>
                      {!item.is_available ? (
                        <p className="cart-page__item-unavailable">Unavailable</p>
                      ) : null}
                    </div>
                    <QuantityStepper
                      value={item.quantity}
                      disabled={!item.is_available}
                      onChange={(qty) => updateQuantity(item.product_id, qty)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove"
                      onClick={() => {
                        removeItem(item.product_id);
                        toast.success('Removed from cart');
                      }}
                    >
                      <Trash2 className="cart-page__item-remove-icon" />
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="cart-page__subtotal">Stall subtotal: {formatVnd(subtotal)}</p>
            </section>
          );
        })}
      </div>

      <div className="cart-page__footer">
        <div className="cart-page__footer-row">
          <div>
            <p className="cart-page__footer-hint">
              {farmerCount} order(s) will be created · Pay on pickup at the stall
            </p>
            <p className="cart-page__footer-total">{formatVnd(total)}</p>
          </div>
          <Button
            asChild
            size="lg"
            disabled={wouldExceedTotal || conflictingFarmers.length > 0}
          >
            <Link to="/app/checkout">Proceed to checkout</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
