import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ShoppingBasket } from 'lucide-react';

import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { MiniCartDrawer } from '@/features/cart/components/MiniCartDrawer';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { usePrefetchRoutes } from '@/hooks/usePrefetchRoutes';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/cn';

import './PublicLayout.css';

const footerLinkClass = 'public-layout__footer-link';

export function PublicLayout() {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);
  const prefetch = usePrefetchRoutes();

  const isCustomerApp = location.pathname.startsWith('/app');
  const isCustomer = Boolean(accessToken) && role === 'CUSTOMER';
  const appHome = role === 'ADMIN' ? '/admin' : role === 'FARMER' ? '/farmer' : '/app';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn('public-layout__nav-link', isActive && 'is-active');

  return (
    <div className="public-layout">
      <a href="#main-content" className="public-layout__skip-link">
        Bỏ qua đến nội dung chính
      </a>

      <header className="public-layout__header">
        <div className="public-layout__header-inner">
          <Link to={isCustomer ? '/app' : '/'} className="public-layout__logo">
            <span className="public-layout__logo-icon-wrap">
              <ShoppingBasket className="public-layout__logo-icon" strokeWidth={1.75} />
            </span>
            <span className="public-layout__logo-text">
              Market<span className="public-layout__logo-accent">Link</span>
            </span>
          </Link>

          <nav className="public-layout__nav-desktop" aria-label="Điều hướng công khai">
            <NavLink
              to="/markets"
              className={navLinkClass}
              onMouseEnter={prefetch.prefetchMarkets}
              onFocus={prefetch.prefetchMarkets}
            >
              Chợ
            </NavLink>
            <NavLink
              to="/products"
              className={navLinkClass}
              onMouseEnter={prefetch.prefetchProducts}
              onFocus={prefetch.prefetchProducts}
            >
              Sản phẩm
            </NavLink>
            <NavLink
              to="/farmers"
              className={navLinkClass}
              onMouseEnter={prefetch.prefetchFarmers}
              onFocus={prefetch.prefetchFarmers}
            >
              Nông dân
            </NavLink>
          </nav>

          <div className="public-layout__actions">
            <ThemeToggle />
            {isCustomer ? (
              <>
                <NotificationBell role="CUSTOMER" listPath="/app/notifications" />
                <MiniCartDrawer />
                <UserMenu />
              </>
            ) : accessToken ? (
              <UserMenu />
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="public-layout__login-btn"
                >
                  <Link to="/login">Đăng nhập</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Đăng ký</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <nav className="public-layout__nav-mobile" aria-label="Điều hướng công khai">
          <NavLink
            to="/markets"
            className={navLinkClass}
            onMouseEnter={prefetch.prefetchMarkets}
            onFocus={prefetch.prefetchMarkets}
          >
            Chợ
          </NavLink>
          <NavLink
            to="/products"
            className={navLinkClass}
            onMouseEnter={prefetch.prefetchProducts}
            onFocus={prefetch.prefetchProducts}
          >
            Sản phẩm
          </NavLink>
          <NavLink
            to="/farmers"
            className={navLinkClass}
            onMouseEnter={prefetch.prefetchFarmers}
            onFocus={prefetch.prefetchFarmers}
          >
            Nông dân
          </NavLink>
        </nav>
      </header>

      <main id="main-content" className="public-layout__main" tabIndex={-1}>
        <Outlet />
      </main>

      {!isCustomerApp ? (
        <footer className="public-layout__footer">
          <div className="public-layout__footer-inner">
            <div className="public-layout__footer-grid">
              <div className="public-layout__footer-about">
                <Link to="/" className="public-layout__logo">
                  <span className="public-layout__logo-icon-wrap">
                    <ShoppingBasket
                      className="public-layout__logo-icon"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="public-layout__logo-text">
                    Market<span className="public-layout__logo-accent">Link</span>
                  </span>
                </Link>
                <p className="public-layout__footer-desc">
                  Nông sản tươi từ phiên chợ địa phương — đặt trước, nhận tại quầy, thanh
                  toán khi đến lấy.
                </p>
              </div>

              <div>
                <p className="public-layout__footer-heading">Khám phá</p>
                <ul className="public-layout__footer-links">
                  <li>
                    <Link to="/markets" className={footerLinkClass}>
                      Danh sách chợ
                    </Link>
                  </li>
                  <li>
                    <Link to="/products" className={footerLinkClass}>
                      Sản phẩm
                    </Link>
                  </li>
                  <li>
                    <Link to="/farmers" className={footerLinkClass}>
                      Nông dân / Quầy
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className="public-layout__footer-heading">Tài khoản</p>
                <ul className="public-layout__footer-links">
                  {accessToken ? (
                    <li>
                      <Link to={appHome} className={footerLinkClass}>
                        Vào ứng dụng
                      </Link>
                    </li>
                  ) : (
                    <>
                      <li>
                        <Link to="/login" className={footerLinkClass}>
                          Đăng nhập
                        </Link>
                      </li>
                      <li>
                        <Link to="/register" className={footerLinkClass}>
                          Đăng ký khách hàng
                        </Link>
                      </li>
                      <li>
                        <Link to="/register/farmer" className={footerLinkClass}>
                          Đăng ký nông dân
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <div className="public-layout__footer-bottom">
              <p>© {new Date().getFullYear()} MarketLink · eGreen Basket</p>
              <p>Farm Fresh Just a Click Away</p>
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
