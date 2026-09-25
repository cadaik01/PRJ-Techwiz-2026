import { lazy, Suspense, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, ExternalLink, MapPin, Navigation, Store } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/feedback/EmptyState';
import { FavoriteButton } from '@/features/customer/components/FavoriteButton';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { FarmerCard } from '@/features/catalog/components/FarmerCard';
import { useMarket, useMarketFarmers } from '@/features/catalog/hooks/useCatalog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { googleMapsDirectionsUrl, WEEKDAY_LABELS } from '@/utils/helpers/geo';
import { useFavorites } from '@/features/customer/hooks/useFavorites';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

import './MarketDetailPage.css';

const MiniMap = lazy(() =>
  import('@/components/common/MarketsMap').then((m) => ({ default: m.MiniMap })),
);

export default function MarketDetailPage() {
  const { id = '' } = useParams();
  const { lat, lng } = useGeolocation();
  const marketQuery = useMarket(id, { lat: lat ?? undefined, lng: lng ?? undefined });
  const farmersQuery = useMarketFarmers(id);
  const { hasMarket, toggleMarket } = useFavorites();

  if (marketQuery.isLoading) return <PageSkeleton />;
  if (marketQuery.isError || !marketQuery.data) {
    return (
      <div className="market-detail-page__empty-wrap">
        <EmptyState
          title="Không tìm thấy chợ"
          actionLabel="Thử lại"
          onAction={() => marketQuery.refetch()}
        />
      </div>
    );
  }

  const market = marketQuery.data;
  const favorited = hasMarket(market.id);
  const addressLine = market.address;

  return (
    <div className="market-detail-page">
      <section className="market-detail-page__banner">
        <img
          src={market.image ?? ''}
          alt={market.name}
          className="market-detail-page__banner-img"
        />
        <div className="market-detail-page__banner-overlay-a" aria-hidden />
        <div className="market-detail-page__banner-overlay-b" aria-hidden />

        <div className="market-detail-page__banner-inner">
          <Link to="/markets" className="market-detail-page__back">
            <ArrowLeft className="market-detail-page__back-icon" aria-hidden />
            Tất cả chợ
          </Link>

          <div className="market-detail-page__banner-head">
            <div className="market-detail-page__banner-copy">
              <h1 className="market-detail-page__title">{market.name}</h1>
              <p className="market-detail-page__address">
                <MapPin
                  className="market-detail-page__address-icon"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span>{addressLine}</span>
              </p>
            </div>

            <FavoriteButton
              active={favorited}
              className="market-detail-page__fav-btn"
              onToggle={() => {
                toggleMarket(market.id);
                toast.success(favorited ? 'Đã bỏ yêu thích' : 'Đã thêm yêu thích');
              }}
            />
          </div>
        </div>
      </section>

      <div className="market-detail-page__body">
        <div className="market-detail-page__meta-row">
          <MetaChip
            icon={<Clock3 strokeWidth={1.75} aria-hidden />}
            label={`${market.open_time}–${market.close_time}`}
          />
          {market.distance_km !== null ? (
            <MetaChip
              icon={<Navigation strokeWidth={1.75} aria-hidden />}
              label={`${market.distance_km.toFixed(1)} km`}
            />
          ) : null}
          <MetaChip
            icon={<Store strokeWidth={1.75} aria-hidden />}
            label={`${market.farmer_count} quầy`}
          />
        </div>

        <div className="market-detail-page__split">
          <div className="market-detail-page__about">
            <div>
              <h2 className="market-detail-page__section-title">Về phiên chợ</h2>
              <p className="market-detail-page__description">{market.description}</p>
            </div>

            <div>
              <p className="market-detail-page__days-label">Ngày họp chợ</p>
              <div className="market-detail-page__days">
                {market.operating_days.map((d) => (
                  <Badge
                    key={d}
                    variant="secondary"
                    className="market-detail-page__day-badge"
                  >
                    {WEEKDAY_LABELS[d]}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="market-detail-page__actions">
              <Button asChild size="lg" className="market-detail-page__btn-press">
                <a
                  href={googleMapsDirectionsUrl(market.latitude, market.longitude)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="market-detail-page__action-icon" aria-hidden />
                  Chỉ đường
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="market-detail-page__btn-press"
              >
                <Link to={`/products?market_id=${market.id}`}>Xem sản phẩm tại chợ</Link>
              </Button>
            </div>
          </div>

          <div className="market-detail-page__map-col">
            <h2 className="market-detail-page__map-title">Bản đồ</h2>
            <Suspense
              fallback={<Skeleton className="market-detail-page__map-skeleton" />}
            >
              <MiniMap
                latitude={market.latitude}
                longitude={market.longitude}
                label={market.name}
                className="market-detail-page__map"
              />
            </Suspense>
          </div>
        </div>

        <section className="market-detail-page__farmers">
          <div className="market-detail-page__farmers-head">
            <div>
              <h2 className="market-detail-page__farmers-title">Nông dân tại chợ</h2>
              <p className="market-detail-page__farmers-desc">
                Các quầy đang bán tại {market.name}
              </p>
            </div>
            {farmersQuery.data ? (
              <p className="market-detail-page__farmers-count">
                {farmersQuery.data.length} quầy
              </p>
            ) : null}
          </div>

          {farmersQuery.isLoading ? (
            <div className="market-detail-page__farmers-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="market-detail-page__farmer-skeleton" />
              ))}
            </div>
          ) : farmersQuery.isError ? (
            <EmptyState
              title="Không tải được danh sách quầy"
              actionLabel="Thử lại"
              onAction={() => farmersQuery.refetch()}
            />
          ) : !farmersQuery.data?.length ? (
            <EmptyState title="Chưa có nông dân tại chợ này" />
          ) : (
            <div className="market-detail-page__farmers-grid">
              {farmersQuery.data.map((farmer) => (
                <div key={farmer.id} className="market-detail-page__farmer-item">
                  <FarmerCard farmer={farmer} />
                  <p className="market-detail-page__stall-note">
                    Quầy tại:{' '}
                    <strong>
                      {farmer.markets
                        .map((m) => m.stall_label ?? m.market_name)
                        .join(' · ')}
                    </strong>
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function MetaChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="market-detail-page__meta-chip">
      <span className="market-detail-page__meta-chip-icon">{icon}</span>
      {label}
    </span>
  );
}
