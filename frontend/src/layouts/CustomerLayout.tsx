import { NavLink, Outlet } from 'react-router-dom';
import { Home, Package, ShoppingCart, UserRound, Store } from 'lucide-react';

import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCartStore } from '@/stores/cart.store';
import { cn } from '@/lib/cn';

import './CustomerLayout.css';

const tabs = [
  { to: '/app', label: 'Trang chủ', icon: Home, end: true },
  { to: '/markets', label: 'Chợ', icon: Store, end: false },
  { to: '/app/cart', label: 'Giỏ', icon: ShoppingCart, end: false },
  { to: '/app/orders', label: 'Đơn', icon: Package, end: false },
  { to: '/app/profile', label: 'Tôi', icon: UserRound, end: false },
];

export function CustomerLayout() {
  const { user } = useAuth();
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

  return (
    <div className="customer-layout">
      <div className="customer-layout__content">
        <p className="customer-layout__greeting">
          Xin chào,{' '}
          <span className="customer-layout__greeting-name">
            {user?.display_name || user?.email}
          </span>
        </p>
        <Outlet />
      </div>

      <nav className="glass customer-layout__tab-bar" aria-label="Điều hướng chính">
        <ul className="customer-layout__tab-list">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn('customer-layout__tab-link', isActive && 'is-active')
                }
              >
                <tab.icon className="customer-layout__tab-icon" />
                {tab.label}
                {tab.to === '/app/cart' && cartCount > 0 ? (
                  <span className="customer-layout__cart-badge">{cartCount}</span>
                ) : null}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
