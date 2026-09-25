import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { QuantityStepper } from '@/components/common/QuantityStepper';
import { Button } from '@/components/ui/Button';
import { useCartProductRefresh } from '@/features/customer/hooks/useCheckout';
import { useCustomerOrders } from '@/features/customer/hooks/useCustomerOrders';
import { usePublicConfigData } from '@/features/catalog/hooks/usePublicConfig';
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
        <PageHeader title="Giỏ hàng" />
        <EmptyState
          title="Giỏ hàng trống"
          description="Thêm sản phẩm từ các quầy để đặt trước."
          actionLabel="Mua sắm ngay"
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
        title="Giỏ hàng"
        description="Mỗi nông dân sẽ tạo thành một đơn riêng khi checkout."
        actions={
          <Button variant="outline" size="sm" onClick={() => clear()}>
            Xóa giỏ
          </Button>
        }
      />

      {(wouldExceedTotal || conflictingFarmers.length > 0) && (
        <div className="cart-page__warn">
          <AlertTriangle className="cart-page__warn-icon" />
          <div>
            {wouldExceedTotal ? (
              <p>
                Bạn đang có {openCount} đơn mở. Thêm {farmerCount} đơn mới sẽ vượt giới
                hạn {maxOpen} đơn mở.
              </p>
            ) : null}
            {conflictingFarmers.length > 0 ? (
              <p className="cart-page__warn-note">
                Đã có đơn mở với quầy này (tối đa {maxPerFarmer}/nông dân). Hãy hoàn thành
                hoặc hủy đơn cũ trước.
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
                      <img src={item.image} alt="" className="cart-page__item-thumb" />
                    ) : (
                      <div className="cart-page__item-thumb--empty" />
                    )}
                    <div className="cart-page__item-body">
                      <p className="cart-page__item-name">{item.name}</p>
                      <p className="cart-page__item-price">
                        {formatVnd(item.price)}/{item.unit}
                      </p>
                      {!item.is_available ? (
                        <p className="cart-page__item-unavailable">Ngừng bán</p>
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
                      aria-label="Xóa"
                      onClick={() => {
                        removeItem(item.product_id);
                        toast.success('Đã xóa khỏi giỏ');
                      }}
                    >
                      <Trash2 className="cart-page__item-remove-icon" />
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="cart-page__subtotal">Tạm tính quầy: {formatVnd(subtotal)}</p>
            </section>
          );
        })}
      </div>

      <div className="cart-page__footer">
        <div className="cart-page__footer-row">
          <div>
            <p className="cart-page__footer-hint">
              {farmerCount} đơn sẽ được tạo · Thanh toán khi nhận tại quầy
            </p>
            <p className="cart-page__footer-total">{formatVnd(total)}</p>
          </div>
          <Button
            asChild
            size="lg"
            disabled={wouldExceedTotal || conflictingFarmers.length > 0}
          >
            <Link to="/app/checkout">Tiến hành đặt hàng</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
