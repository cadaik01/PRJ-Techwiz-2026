import { lazy, Suspense,                } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock3, ExternalLink, MapPin, Navigation, Store } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/common/feedback/EmptyState';
import { FavoriteButton } from '@/components/customer/FavoriteButton';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { FarmerCard } from '@/components/guest/FarmerCard';
import { LazyImage } from '@/components/common/cards/LazyImage';
import { useMarket, useMarketFarmers } from '@/hooks/queries/guest/useCatalog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { googleMapsDirectionsUrl, WEEKDAY_LABELS } from '@/utils/helpers/geo';
import { useFavorites } from '@/hooks/queries/customer/useFavorites';
import { Badge } from '@/components/common/badges/Badge';
import { Button } from '@/components/common/forms/Button';
import { Skeleton } from '@/components/common/feedback/Skeleton';

import './MarketDetailPage.css';

const MiniMap = lazy(() =>
  import('@/components/common/maps/MarketsMap').then((m) => ({ default: m.MiniMap })),
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
          title="This market could not be found"
          actionLabel="Try again"
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
        <LazyImage
          src={market.image}
          alt={market.name}
          className="market-detail-page__banner-img"
        />
        <div className="market-detail-page__banner-overlay-a" aria-hidden />
        <div className="market-detail-page__banner-overlay-b" aria-hidden />

        <div className="market-detail-page__banner-inner">
          <Link to="/markets" className="market-detail-page__back">
            <ArrowLeft className="market-detail-page__back-icon" aria-hidden />
            Back to markets
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
                toast.success(favorited ? 'Removed from favorites' : 'Added to favorites');
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
            label={`${market.farmer_count} stalls`}
          />
        </div>

        <div className="market-detail-page__split">
          <div className="market-detail-page__about">
            <div>
              <h2 className="market-detail-page__section-title">About the market</h2>
              <p className="market-detail-page__description">{market.description}</p>
            </div>

            <div>
              <p className="market-detail-page__days-label">Open on</p>
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
                  Get directions
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="market-detail-page__btn-press"
              >
                <Link to={`/products?market_id=${market.id}`}>Shop produce here</Link>
              </Button>
            </div>
          </div>

          <div className="market-detail-page__map-col">
            <h2 className="market-detail-page__map-title">On the map</h2>
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
              <h2 className="market-detail-page__farmers-title">Stalls at this market</h2>
              <p className="market-detail-page__farmers-desc">
                Growers currently selling at {market.name}
              </p>
            </div>
            {farmersQuery.data ? (
              <p className="market-detail-page__farmers-count">
                {farmersQuery.data.length} stalls
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
              title="Stalls couldn't be loaded"
              actionLabel="Try again"
              onAction={() => farmersQuery.refetch()}
            />
          ) : !farmersQuery.data?.length ? (
            <EmptyState title="No stalls are listed at this market yet" />
          ) : (
            <div className="market-detail-page__farmers-grid">
              {farmersQuery.data.map((farmer) => (
                <div key={farmer.id} className="market-detail-page__farmer-item">
                  <FarmerCard farmer={farmer} />
                  <p className="market-detail-page__stall-note">
                    Stall location:{' '}
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

function MetaChip({ icon, label }                                    ) {
  return (
    <span className="market-detail-page__meta-chip">
      <span className="market-detail-page__meta-chip-icon">{icon}</span>
      {label}
    </span>
  );
}
