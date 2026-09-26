import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LocateFixed } from 'lucide-react';

import { FarmerCard } from '@/components/guest/FarmerCard';
import { MarketCard } from '@/components/guest/MarketCard';
import { ProductCardView } from '@/components/guest/ProductCardView';
import {
  useCategories,
  useFarmers,
  useMarkets,
  useProducts,
} from '@/hooks/queries/guest/useCatalog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Button } from '@/components/common/forms/Button';
import { Input } from '@/components/common/forms/Input';
import { Skeleton } from '@/components/common/feedback/Skeleton';
import { EmptyState } from '@/components/common/feedback/EmptyState';
import { CategoryIcon } from '@/components/common/badges/CategoryIcon';

import './HomePage.css';

const HERO_VIDEO = '/banner.mp4';

const STEPS = [
  {
    title: 'Discover',
    desc: 'Explore nearby markets, trusted stalls, and seasonal produce',
  },
  {
    title: 'Pre-order',
    desc: 'Reserve what you need — your selection is held at the stall',
  },
  {
    title: 'Choose a slot',
    desc: 'Pick a convenient pickup window that fits your day',
  },
  {
    title: 'Collect & pay',
    desc: 'Arrive on time, pay at the stall, and leave with peak-fresh produce',
  },
] as const;


function SectionHeading({
  title,
  description,
  href,
  linkLabel = 'View all',
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
            <p className="home-page__eyebrow">MarketLink</p>
            <h1 className="home-page__title">Local markets, reserved for you</h1>
            <p className="home-page__intro">
              Pre-order from trusted stalls, pick up on your schedule, and pay
              when you collect — no delivery fees, just fresher produce.
            </p>

            <form
              className="home-page__search"
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
              <Input
                id="home-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                label="Search produce, stalls, or markets"
                className="home-page__search-input"
              />
              <Button
                type="submit"
                variant="accent"
                className="home-page__search-submit"
              >
                Search
              </Button>
            </form>

            <div className="home-page__hero-actions">
              <Button
                type="button"
                variant="outline"
                className="home-page__hero-btn"
                onClick={requestLocation}
              >
                <LocateFixed className="home-page__icon-sm" aria-hidden />
                Use my location
              </Button>
              <Button asChild variant="outline" className="home-page__hero-btn">
                <Link to="/markets">
                  Browse all markets
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
            <h2 className="home-page__categories-title">Shop by category</h2>
            <p className="home-page__categories-hint">
              From greens to dairy — find today's freshest picks
            </p>
          </div>
          <div className="home-page__categories-scroll">
            {categoriesQuery.isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="home-page__category-skeleton" />
                ))
              : categoriesQuery.data?.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/products?category=${cat.id}`}
                    className="home-page__category-card"
                  >
                    <span className="home-page__category-icon-wrap">
                      <CategoryIcon icon={cat.icon} className="home-page__category-icon" />
                    </span>
                    <span className="home-page__category-name">{cat.name}</span>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      <section className="home-page__section">
        <SectionHeading
          title="Markets near you"
          description={
            lat != null
              ? 'Closest markets to where you are right now'
              : 'Share your location to see the nearest markets first'
          }
          href="/markets"
          linkLabel="See all markets"
        />
        {marketsQuery.isLoading ? (
          <div className="home-page__grid-markets">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="home-page__skeleton-market" />
            ))}
          </div>
        ) : marketsQuery.isError ? (
          <EmptyState
            title="Markets couldn't be loaded"
            actionLabel="Try again"
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
            title="Today's standouts"
            description="Top-rated produce, ready to pre-order and pick up"
            href="/products"
            linkLabel="Browse all produce"
          />
          {productsQuery.isLoading ? (
            <div className="home-page__grid-products">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="home-page__skeleton-product" />
              ))}
            </div>
          ) : productsQuery.isError ? (
            <EmptyState
              title="Products couldn't be loaded"
              actionLabel="Try again"
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
          title="Stalls worth knowing"
          description="Meet highly rated farmers before you place your order"
          href="/farmers"
          linkLabel="Browse all stalls"
        />
        {farmersQuery.isLoading ? (
          <div className="home-page__grid-farmers">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="home-page__skeleton-farmer" />
            ))}
          </div>
        ) : farmersQuery.isError ? (
          <EmptyState
            title="Stalls couldn't be loaded"
            actionLabel="Try again"
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
            <p className="home-page__how-eyebrow">How MarketLink works</p>
            <h2 className="home-page__how-title">From browse to bag in four steps</h2>
            <p className="home-page__how-desc">
              Reserve ahead, skip the guesswork, and walk out with produce
              waiting for you.
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
            <p className="home-page__cta-title">Your next market run starts here</p>
            <p className="home-page__cta-desc">
              Find a nearby market, choose a stall you trust, and lock in your
              pre-order in minutes.
            </p>
          </div>
          <div className="home-page__cta-actions">
            <Button asChild size="lg" variant="accent" className="home-page__cta-btn">
              <Link to="/markets">Explore markets</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="home-page__cta-btn home-page__cta-outline"
            >
              <Link to="/products">Shop produce</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
