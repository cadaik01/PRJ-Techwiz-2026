import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  useAdminMarkets,
  useToggleAdminMarket,
} from '@/hooks/queries/admin/useAdminMarkets';
import { EmptyState } from '@/components/common/feedback/EmptyState';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { Badge } from '@/components/common/badges/Badge';
import { Button } from '@/components/common/forms/Button';
import { SortSelect } from '@/components/common/table/SortSelect';

import './AdminMarketsPage.css';

const SORT_OPTIONS = [
  { value: 'name', label: 'Name A–Z' },
  { value: '-name', label: 'Name Z–A' },
  { value: '-farmer_count', label: 'Most stalls' },
  { value: '-open_order_count', label: 'Most open orders' },
  { value: '-is_active', label: 'Active first' },
];

export default function AdminMarketsPage() {
  const [ordering, setOrdering] = useState<string | undefined>(undefined);
  const query = useAdminMarkets({ ordering });
  const toggle = useToggleAdminMarket();

  return (
    <div className="admin-markets-page">
      <PageHeader
        title="Markets"
        description="Create market sessions, edit details, and toggle availability."
        actions={
          <Button asChild>
            <Link to="/admin/markets/new">Add a market</Link>
          </Button>
        }
      />

      <SortSelect
        id="market-sort"
        options={SORT_OPTIONS}
        value={ordering}
        onChange={setOrdering}
      />

      {query.isLoading ? (
        <PageSkeleton />
      ) : !query.data?.results.length ? (
        <EmptyState
          title="No markets yet"
          description="Add your first market so stalls and shoppers have a place to meet."
        />
      ) : (
        <div className="admin-markets-page__grid">
          {query.data.results.map((m) => (
            <div key={m.id} className="admin-markets-page__card">
              <div className="admin-markets-page__card-head">
                <div>
                  <Link
                    to={`/admin/markets/${m.id}/edit`}
                    className="admin-markets-page__link"
                  >
                    {m.name}
                  </Link>
                  <p className="admin-markets-page__address">{m.address}</p>
                </div>
                <Badge variant={m.is_active ? 'success' : 'secondary'}>
                  {m.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="admin-markets-page__meta">
                {m.open_time}–{m.close_time} · {m.farmer_count} stalls
              </p>
              <div className="admin-markets-page__actions">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/admin/markets/${m.id}/edit`}>Edit</Link>
                </Button>
                <Button
                  size="sm"
                  variant={m.is_active ? 'destructive' : 'default'}
                  loading={toggle.isPending}
                  onClick={() => toggle.mutate({ id: m.id, active: !m.is_active })}
                >
                  {m.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
