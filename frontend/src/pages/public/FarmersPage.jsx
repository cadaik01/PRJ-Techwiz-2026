import { useState } from 'react';
import { EmptyState } from '@/components/feedback/EmptyState';
import { FarmerCard } from '@/features/catalog/components/FarmerCard';
import { useFarmers } from '@/features/catalog/hooks/useCatalog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import './FarmersPage.css';
function parseFarmerSort(value) {
    if (value === 'rating' ||
        value === 'in_stock' ||
        value === 'distance' ||
        value === 'name' ||
        value === 'name_desc') {
        return value;
    }
    return 'rating';
}
export default function FarmersPage() {
    const { lat, lng } = useGeolocation();
    const [q, setQ] = useState('');
    const [sort, setSort] = useState('rating');
    const query = useFarmers({
        q: q || undefined,
        ordering: sort,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        page_size: 20,
    });
    const farmers = query.data?.results ?? [];
    return (<div className="farmers-page">
      <section className="farmers-page__hero">
        <div className="farmers-page__hero-inner">
          <div className="farmers-page__hero-copy">
            <p className="farmers-page__eyebrow">Meet the growers</p>
            <h1 className="farmers-page__title">Farmer stalls</h1>
            <p className="farmers-page__subtitle">
              {lat != null
            ? 'Showing stalls closest to you first'
            : 'Discover trusted stalls by name, rating, or stock'}
            </p>
          </div>
        </div>
      </section>

      <div className="farmers-page__body">
        <div className="farmers-page__toolbar">
          <div className="farmers-page__search-row">
            <div className="farmers-page__search-wrap">
              <Input value={q} onChange={(e) => setQ(e.target.value)} label="Search by stall name" className="farmers-page__search-input"/>
            </div>

            <select className="farmers-page__select" value={sort} onChange={(e) => setSort(parseFarmerSort(e.target.value))} aria-label="Sort stalls">
              <option value="rating">Top rated</option>
              <option value="in_stock">Best stocked</option>
              <option value="distance">Nearest first</option>
              <option value="name">Name A–Z</option>
              <option value="name_desc">Name Z–A</option>
            </select>
          </div>
        </div>

        {!query.isLoading && !query.isError && farmers.length > 0 ? (<p className="farmers-page__count">{farmers.length} stalls</p>) : null}

        {query.isLoading ? (<div className="farmers-page__grid">
            {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="farmers-page__skeleton"/>))}
          </div>) : query.isError ? (<EmptyState title="Stalls couldn't be loaded" actionLabel="Try again" onAction={() => query.refetch()}/>) : farmers.length === 0 ? (<EmptyState title="No stalls match your search" description="Try another name, or clear filters to see everyone."/>) : (<div className="farmers-page__grid">
            {farmers.map((farmer) => (<FarmerCard key={farmer.id} farmer={farmer}/>))}
          </div>)}
      </div>
    </div>);
}
