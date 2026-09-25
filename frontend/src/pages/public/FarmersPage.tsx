import { useState } from 'react';
import { Search } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { FarmerCard } from '@/features/catalog/components/FarmerCard';
import { useFarmers } from '@/features/catalog/hooks/useCatalog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import type { FarmerSort } from '@/types';

import './FarmersPage.css';

function parseFarmerSort(value: string): FarmerSort {
  if (
    value === 'rating' ||
    value === 'in_stock' ||
    value === 'distance' ||
    value === 'name'
  ) {
    return value;
  }
  return 'rating';
}

export default function FarmersPage() {
  const { lat, lng } = useGeolocation();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<FarmerSort>('rating');

  const query = useFarmers({
    q: q || undefined,
    ordering: sort,
    lat: lat ?? undefined,
    lng: lng ?? undefined,
    page_size: 20,
  });

  const farmers = query.data?.results ?? [];

  return (
    <div className="farmers-page">
      <section className="farmers-page__hero">
        <div className="farmers-page__hero-inner">
          <div className="farmers-page__hero-copy">
            <p className="farmers-page__eyebrow">Quầy nông dân</p>
            <h1 className="farmers-page__title">Nông dân / Quầy</h1>
            <p className="farmers-page__subtitle">
              {lat != null
                ? 'Đang ưu tiên quầy gần vị trí của bạn'
                : 'Tìm theo tên quầy, hoặc lọc theo đánh giá và tồn kho'}
            </p>
          </div>
        </div>
      </section>

      <div className="farmers-page__body">
        <div className="farmers-page__toolbar">
          <div className="farmers-page__search-wrap">
            <Search className="farmers-page__search-icon" aria-hidden />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên quầy…"
              className="farmers-page__search-input"
              aria-label="Tìm quầy"
            />
          </div>

          <div className="farmers-page__sort-row">
            <select
              className="farmers-page__select"
              value={sort}
              onChange={(e) => setSort(parseFarmerSort(e.target.value))}
              aria-label="Sắp xếp"
            >
              <option value="rating">Đánh giá cao</option>
              <option value="in_stock">Còn nhiều hàng</option>
              <option value="distance">Gần nhất</option>
              <option value="name">Tên A–Z</option>
            </select>
          </div>
        </div>

        {!query.isLoading && !query.isError && farmers.length > 0 ? (
          <p className="farmers-page__count">{farmers.length} quầy</p>
        ) : null}

        {query.isLoading ? (
          <div className="farmers-page__grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="farmers-page__skeleton" />
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState
            title="Không tải được danh sách"
            actionLabel="Thử lại"
            onAction={() => query.refetch()}
          />
        ) : farmers.length === 0 ? (
          <EmptyState
            title="Không có quầy phù hợp"
            description="Thử đổi bộ lọc hoặc từ khóa."
          />
        ) : (
          <div className="farmers-page__grid">
            {farmers.map((farmer) => (
              <FarmerCard key={farmer.id} farmer={farmer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
