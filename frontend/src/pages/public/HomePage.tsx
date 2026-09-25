import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Apple,
  ArrowRight,
  Egg,
  Flame,
  Leaf,
  LocateFixed,
  Milk,
  Search,
  Wheat,
} from 'lucide-react';

import { FarmerCard } from '@/features/catalog/components/FarmerCard';
import { MarketCard } from '@/features/catalog/components/MarketCard';
import { ProductCardView } from '@/features/catalog/components/ProductCardView';
import {
  useCategories,
  useFarmers,
  useMarkets,
  useProducts,
} from '@/features/catalog/hooks/useCatalog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';

import './HomePage.css';

const HERO_VIDEO = '/banner.mp4';

const STEPS = [
  { title: 'Chọn', desc: 'Tìm chợ, quầy và sản phẩm gần bạn' },
  { title: 'Đặt trước', desc: 'Thêm vào giỏ và gửi pre-order' },
  { title: 'Chọn giờ', desc: 'Chọn khung giờ nhận tại quầy' },
  { title: 'Đến lấy', desc: 'Thanh toán khi nhận hàng tại quầy' },
] as const;

function resolveCategoryIcon(icon: string | null) {
  const key = icon ?? 'leaf';
  switch (key) {
    case 'leaf':
      return Leaf;
    case 'apple':
      return Apple;
    case 'milk':
      return Milk;
    case 'egg':
      return Egg;
    case 'wheat':
      return Wheat;
    case 'flame':
      return Flame;
    default:
      return Leaf;
  }
}

function SectionHeading({
  title,
  description,
  href,
  linkLabel = 'Xem tất cả',
}: {
  title: string;
  description: string;
  href: string;
  linkLabel?: string;
}) {
  return (
    <div className="home-page__section-heading">
      <div className="home-page__section-copy">
        <h2 className="home-page__section-title">{title}</h2>
        <p className="home-page__section-desc">{description}</p>
      </div>
      <Button asChild variant="ghost" className="home-page__section-link">
        <Link to={href}>
          {linkLabel}
          <span className="home-page__section-link-icon">
            <ArrowRight className="home-page__section-link-arrow" aria-hidden />
          </span>
        </Link>
      </Button>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { lat, lng, requestLocation } = useGeolocation();

  const categoriesQuery = useCategories();
  const marketsQuery = useMarkets({
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    ordering: lat != null ? 'distance' : 'name',
    page_size: 5,
  });
  const productsQuery = useProducts({ page_size: 10, ordering: 'rating' });
  const farmersQuery = useFarmers({ ordering: 'rating', page_size: 5 });

  return (
    <div className="home-page">
      <section className="home-page__hero">
        <video
          className="home-page__hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        >
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        <div className="home-page__hero-overlay-a" aria-hidden />
        <div className="home-page__hero-overlay-b" aria-hidden />

        <div className="home-page__hero-inner">
          <div className="home-page__hero-copy">
            <p className="home-page__brand">MarketLink</p>
            <h1 className="home-page__tagline">
              Nông sản tươi — đặt trước, nhận tại quầy
            </h1>
            <p className="home-page__intro">
              Kết nối bạn với phiên chợ địa phương. Không giao hàng — thanh toán khi đến
              lấy.
            </p>

            <form
              className="home-page__search-form"
              onSubmit={(e) => {
                e.preventDefault();
                const term = q.trim();
                if (!term) {
                  navigate('/products');
                  return;
                }
                navigate(`/products?q=${encodeURIComponent(term)}`);
              }}
            >
              <div className="home-page__search-field">
                <Search className="home-page__search-icon" aria-hidden />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm sản phẩm, chợ hoặc quầy…"
                  className="home-page__search-input"
                  aria-label="Tìm kiếm"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                variant="accent"
                className="home-page__search-submit"
              >
                Tìm kiếm
              </Button>
            </form>

            <div className="home-page__hero-actions">
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="home-page__btn-locate"
                onClick={requestLocation}
              >
                <LocateFixed className="home-page__icon-sm" aria-hidden />
                Dùng vị trí của tôi
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="home-page__btn-markets"
              >
                <Link to="/markets">
                  Xem chợ gần đây
                  <ArrowRight className="home-page__icon-sm" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="home-page__categories">
        <div className="home-page__categories-inner">
          <div className="home-page__categories-head">
            <h2 className="home-page__categories-title">Danh mục</h2>
            <p className="home-page__categories-hint">Chọn nhanh theo loại nông sản</p>
          </div>
          <div className="home-page__categories-scroll">
            {categoriesQuery.isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="home-page__category-skeleton" />
                ))
              : categoriesQuery.data?.map((cat) => {
                  const Icon = resolveCategoryIcon(cat.icon);
                  return (
                    <Link
                      key={cat.id}
                      to={`/products?category=${cat.id}`}
                      className="home-page__category-card"
                    >
                      <span className="home-page__category-icon-wrap">
                        <Icon className="home-page__category-icon" strokeWidth={1.75} />
                      </span>
                      <span className="home-page__category-name">{cat.name}</span>
                    </Link>
                  );
                })}
          </div>
        </div>
      </section>

      <section className="home-page__section">
        <SectionHeading
          title="Chợ gần bạn"
          description={
            lat != null
              ? 'Sắp xếp theo khoảng cách từ vị trí hiện tại'
              : 'Bật vị trí để ưu tiên chợ gần nhất'
          }
          href="/markets"
        />
        {marketsQuery.isLoading ? (
          <div className="home-page__grid-markets">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="home-page__skeleton-market" />
            ))}
          </div>
        ) : marketsQuery.isError ? (
          <EmptyState
            title="Không tải được danh sách chợ"
            actionLabel="Thử lại"
            onAction={() => marketsQuery.refetch()}
          />
        ) : (
          <div className="home-page__grid-markets">
            {marketsQuery.data?.results.slice(0, 3).map((m) => (
              <MarketCard key={m.id} market={m} />
            ))}
          </div>
        )}
      </section>

      <section className="home-page__section--highlight">
        <div className="home-page__section-inner">
          <SectionHeading
            title="Sản phẩm nổi bật"
            description="Được đánh giá cao và còn hàng hôm nay"
            href="/products"
          />
          {productsQuery.isLoading ? (
            <div className="home-page__grid-products">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="home-page__skeleton-product" />
              ))}
            </div>
          ) : productsQuery.isError ? (
            <EmptyState
              title="Không tải được sản phẩm"
              actionLabel="Thử lại"
              onAction={() => productsQuery.refetch()}
            />
          ) : (
            <div className="home-page__grid-products">
              {productsQuery.data?.results.slice(0, 8).map((p) => (
                <ProductCardView key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="home-page__section">
        <SectionHeading
          title="Nông dân được yêu thích"
          description="Quầy có rating cao — quen mặt trước khi đặt"
          href="/farmers"
        />
        {farmersQuery.isLoading ? (
          <div className="home-page__grid-farmers">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="home-page__skeleton-farmer" />
            ))}
          </div>
        ) : farmersQuery.isError ? (
          <EmptyState
            title="Không tải được danh sách nông dân"
            actionLabel="Thử lại"
            onAction={() => farmersQuery.refetch()}
          />
        ) : (
          <div className="home-page__grid-farmers">
            {farmersQuery.data?.results.slice(0, 4).map((f) => (
              <FarmerCard key={f.id} farmer={f} />
            ))}
          </div>
        )}
      </section>

      <section className="home-page__how">
        <div className="home-page__how-inner">
          <div className="home-page__how-intro">
            <p className="home-page__how-eyebrow">Cách hoạt động</p>
            <h2 className="home-page__how-title">Bốn bước đến nông sản tươi</h2>
            <p className="home-page__how-desc">
              Pre-order tại chợ — cầm túi đến đúng giờ, không chờ xếp hàng.
            </p>
          </div>

          <ol className="home-page__steps">
            {STEPS.map((step, index) => (
              <li key={step.title} className="home-page__step">
                <span className="home-page__step-num">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="home-page__step-title">{step.title}</h3>
                <p className="home-page__step-desc">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="home-page__cta">
        <div className="home-page__cta-bg" aria-hidden />
        <div className="home-page__cta-blob-a" aria-hidden />
        <div className="home-page__cta-blob-b" aria-hidden />
        <div className="home-page__cta-inner">
          <div className="home-page__cta-copy">
            <p className="home-page__cta-title">Sẵn sàng cho phiên chợ hôm nay?</p>
            <p className="home-page__cta-desc">
              Duyệt chợ gần bạn, chọn quầy tin cậy và đặt trước trong vài phút.
            </p>
          </div>
          <div className="home-page__cta-actions">
            <Button asChild size="lg" variant="accent" className="home-page__cta-btn">
              <Link to="/markets">Khám phá chợ</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="home-page__cta-btn home-page__cta-outline"
            >
              <Link to="/products">Xem sản phẩm</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
