import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft, ShoppingBasket } from 'lucide-react';

import { ThemeToggle } from '@/components/layout/ThemeToggle';

import './AuthLayout.css';

const AUTH_VIDEO = '/banner.mp4';

export function AuthLayout() {
  return (
    <div className="auth-layout">
      <a href="#main-content" className="auth-layout__skip-link">
        Bỏ qua đến nội dung chính
      </a>

      <aside className="auth-layout__aside">
        <video
          className="auth-layout__video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        >
          <source src={AUTH_VIDEO} type="video/mp4" />
        </video>
        <div className="auth-layout__aside-overlay" />
        <div className="auth-layout__aside-overlay auth-layout__aside-overlay--bottom" />

        <div className="auth-layout__aside-inner">
          <Link to="/" className="auth-layout__brand">
            <span className="auth-layout__brand-icon-wrap">
              <ShoppingBasket className="auth-layout__brand-icon" strokeWidth={1.75} />
            </span>
            <span className="auth-layout__brand-name">MarketLink</span>
          </Link>

          <div className="auth-layout__hero-copy">
            <p className="auth-layout__hero-title">MarketLink</p>
            <h1 className="auth-layout__hero-heading">
              Nông sản tươi — đặt trước, nhận tại quầy
            </h1>
            <p className="auth-layout__hero-desc">
              Kết nối phiên chợ địa phương với người mua. Không giao hàng — thanh toán khi
              đến lấy.
            </p>
          </div>

          <p className="auth-layout__aside-tagline">Farm Fresh Just a Click Away</p>
        </div>
      </aside>

      <div className="auth-layout__panel">
        <div className="auth-layout__panel-glow" />

        <header className="auth-layout__header">
          <Link to="/" className="auth-layout__mobile-brand">
            <span className="auth-layout__mobile-brand-icon">
              <ShoppingBasket className="auth-layout__brand-icon" strokeWidth={1.75} />
            </span>
            Market<span className="auth-layout__mobile-brand-accent">Link</span>
          </Link>

          <Link to="/" className="auth-layout__home-link">
            <ArrowLeft className="auth-layout__home-link-icon" />
            Về trang chủ
          </Link>

          <ThemeToggle />
        </header>

        <div id="main-content" className="auth-layout__main" tabIndex={-1}>
          <div className="auth-layout__main-inner">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
