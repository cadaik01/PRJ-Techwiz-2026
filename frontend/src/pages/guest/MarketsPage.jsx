import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/common/feedback/EmptyState';
import { MarketCard } from '@/components/guest/MarketCard';
import { useMarkets } from '@/hooks/queries/guest/useCatalog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { WEEKDAY_LABELS } from '@/utils/helpers/geo';
import { Input } from '@/components/common/forms/Input';
import { Skeleton } from '@/components/common/feedback/Skeleton';

import './MarketsPage.css';

function parseMarketSort(value        )             {
  if (value === 'distance' || value === 'name' || value === 'name_desc') return value;
  return 'name';
}

const DAY_OPTIONS                                             = [
  { value: 1, label: WEEKDAY_LABELS[1] },
  { value: 2, label: WEEKDAY_LABELS[2] },
  { value: 3, label: WEEKDAY_LABELS[3] },
  { value: 4, label: WEEKDAY_LABELS[4] },
  { value: 5, label: WEEKDAY_LABELS[5] },
  { value: 6, label: WEEKDAY_LABELS[6] },
  { value: 7, label: WEEKDAY_LABELS[7] },
];

export default function MarketsPage() {
  const { lat, lng } = useGeolocation();
  const [q, setQ] = useState('');
  const [weekday, setWeekday] = useState                       ();
  const [sort, setSort] = useState            (lat != null ? 'distance' : 'name');

  const query = useMarkets({
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    q: q || undefined,
    day: weekday,
    ordering: sort,
    page_size: 20,
  });

  const markets = useMemo(() => query.data?.results ?? [], [query.data]);

  return (
    <div className="markets-page">
      <section className="markets-page__hero">
        <div className="markets-page__hero-inner">
          <div className="markets-page__hero-copy">
            <p className="markets-page__eyebrow">Where freshness gathers</p>
            <h1 className="markets-page__title">Local markets</h1>
            <p className="markets-page__subtitle">
              {lat != null
                ? 'Nearest markets to you, ready for your next visit'
                : 'Search by name, address, or the days they open'}
            </p>
          </div>
        </div>
      </section>

      <div className="markets-page__body">
        <div className="markets-page__toolbar">
          <div className="markets-page__search-row">
            <div className="markets-page__search-wrap">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                label="Search markets or addresses"
                className="markets-page__search-input"
              />
            </div>

            <select
              className="markets-page__select"
              value={sort}
              onChange={(e) => setSort(parseMarketSort(e.target.value))}
              aria-label="Sort markets"
            >
              <option value="distance">Nearest first</option>
              <option value="name">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
          </div>

          <div className="markets-page__day-list">
            {DAY_OPTIONS.map((d) => {
              const active = weekday === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  className={
                    active
                      ? 'markets-page__day-btn markets-page__day-btn--active'
                      : 'markets-page__day-btn'
                  }
                  onClick={() => setWeekday(active ? undefined : d.value)}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {!query.isLoading && !query.isError && markets.length > 0 ? (
          <p className="markets-page__count">{markets.length} markets</p>
        ) : null}

        {query.isLoading ? (
          <div className="markets-page__grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="markets-page__skeleton" />
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState
            title="Markets couldn't be loaded"
            actionLabel="Try again"
            onAction={() => query.refetch()}
          />
        ) : markets.length === 0 ? (
          <EmptyState
            title="No markets match your filters"
            description="Try another day, keyword, or clear your search."
          />
        ) : (
          <div className="markets-page__grid">
            {markets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
