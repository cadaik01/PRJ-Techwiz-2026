import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

import { Button } from '@/components/common/forms/Button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/common/drawer/Sheet';
import { formatVnd } from '@/utils/formatters';
import { moneyToNumber } from '@/types';
import { useCartStore } from '@/stores/cart.store';

import './MiniCartDrawer.css';

export function MiniCartDrawer() {
  const items = useCartStore((s) => s.items);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + moneyToNumber(i.price) * i.quantity, 0);

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = String(item.farmer_id);
    const list = acc[key] ?? [];
    list.push(item);
    acc[key] = list;
    return acc;
  }, {});

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cart"
          className="mini-cart__trigger"
        >
          <ShoppingCart className="mini-cart__icon" />
          {count > 0 ? <span className="mini-cart__badge">{count}</span> : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="mini-cart__sheet">
        <SheetHeader>
          <SheetTitle>Your cart ({count})</SheetTitle>
        </SheetHeader>
        <div className="mini-cart__list">
          {Object.entries(grouped).map(([farmerId, farmerItems]) => (
            <div key={farmerId} className="mini-cart__group">
              <p className="mini-cart__group-title">{farmerItems[0]?.farmer_name}</p>
              <ul className="mini-cart__items">
                {farmerItems.map((item) => (
                  <li key={item.product_id} className="mini-cart__line">
                    <span className="mini-cart__line-name">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="mini-cart__line-price">
                      {formatVnd(moneyToNumber(item.price) * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {items.length === 0 ? (
            <p className="mini-cart__empty">Nothing reserved yet — add produce to get started.</p>
          ) : null}
        </div>
        <div className="mini-cart__footer">
          <div className="mini-cart__total">
            <span>Subtotal</span>
            <span>{formatVnd(total)}</span>
          </div>
          <Button
            asChild
            className="mini-cart__checkout-btn"
            disabled={items.length === 0}
          >
            <Link to="/app/cart">Review cart</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
