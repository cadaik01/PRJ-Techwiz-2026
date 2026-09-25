import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { MarketCard } from '@/features/catalog/components/MarketCard';
import { useMarkets } from '@/features/catalog/hooks/useCatalog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { WEEKDAY_LABELS } from '@/utils/helpers/geo';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import type { DayOfWeek, MarketSort } from '@/types';

import './MarketsPage.css';

function parseMarketSort(value: string): MarketSort {
  if (value === 'distance' || value === 'name') return value;
  return 'name';
}

const DAY_OPTIONS: Array<{ value: DayOfWeek; label: string }> = [
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
  const [weekday, setWeekday] = useState<DayOfWeek | undefined>();
  const [sort, setSort] = useState<MarketSort>(lat != null ? 'distance' : 'name');

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
            <p className="markets-page__eyebrow">Phiên chợ địa phương</p>
            <h1 className="markets-page__title">Danh sách chợ</h1>
            <p className="markets-page__subtitle">
              {lat != null
                ? 'Đang ưu tiên chợ gần vị trí của bạn'
                : 'Tìm theo tên, địa chỉ hoặc ngày họp chợ'}
            </p>
          </div>
        </div>
      </section>

      <div className="markets-page__body">
        <div className="markets-page__toolbar">
          <div className="markets-page__search-wrap">
            <Search className="markets-page__search-icon" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên chợ, địa chỉ…"
              className="markets-page__search-input"
              aria-label="Tìm chợ"
            />
          </div>

          <div className="markets-page__filters-row">
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

            <select
              className="markets-page__select"
              value={sort}
              onChange={(e) => setSort(parseMarketSort(e.target.value))}
              aria-label="Sắp xếp"
            >
              <option value="distance">Khoảng cách</option>
              <option value="name">Tên A–Z</option>
            </select>
          </div>
        </div>

        {!query.isLoading && !query.isError && markets.length > 0 ? (
          <p className="markets-page__count">{markets.length} chợ</p>
        ) : null}

        {query.isLoading ? (
          <div className="markets-page__grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="markets-page__skeleton" />
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState
            title="Không tải được chợ"
            actionLabel="Thử lại"
            onAction={() => query.refetch()}
          />
        ) : markets.length === 0 ? (
          <EmptyState
            title="Không có chợ phù hợp"
            description="Thử đổi bộ lọc hoặc từ khóa."
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
