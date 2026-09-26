import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminMarkets, useToggleAdminMarket } from '@/features/admin/hooks/useAdminMarkets';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import './AdminMarketsPage.css';
export default function AdminMarketsPage() {
    const query = useAdminMarkets();
    const toggle = useToggleAdminMarket();
    const [q, setQ] = useState('');
    const markets = useMemo(() => {
        const results = query.data?.results ?? [];
        const needle = q.trim().toLowerCase();
        if (!needle)
            return results;
        return results.filter((m) => m.name.toLowerCase().includes(needle) ||
            m.address.toLowerCase().includes(needle));
    }, [query.data, q]);
    return (<div className="admin-markets-page">
      <PageHeader eyebrow="Market sessions" title="Markets" description="Create market sessions, edit details, and toggle availability." actions={<Button asChild>
            <Link to="/admin/markets/new">Add a market</Link>
          </Button>}/>

      <div className="page-primitive__toolbar">
        <Input label="Search markets" value={q} onChange={(e) => setQ(e.target.value)} className="page-primitive__input-narrow"/>
      </div>

      {query.isLoading ? (<PageSkeleton />) : !query.data?.results.length ? (<EmptyState title="No markets yet" description="Add your first market so stalls and shoppers have a place to meet."/>) : !markets.length ? (<EmptyState title="No markets match your search"/>) : (<div className="admin-markets-page__grid">
          {markets.map((m) => (<div key={m.id} className="admin-markets-page__card">
              <div className="admin-markets-page__card-head">
                <div>
                  <Link to={`/admin/markets/${m.id}/edit`} className="admin-markets-page__link">
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
                <Button size="sm" variant={m.is_active ? 'destructive' : 'default'} loading={toggle.isPending} onClick={() => toggle.mutate({ id: m.id, active: !m.is_active })}>
                  {m.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>))}
        </div>)}
    </div>);
}
