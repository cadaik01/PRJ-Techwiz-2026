import { Link, useParams } from 'react-router-dom';
import { useAdminFarmer } from '@/features/admin/hooks/useAdminFarmers';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { PriceTag } from '@/components/common/PriceTag';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDateTime } from '@/utils/formatters';
import './AdminFarmerDetailPage.css';
export default function AdminFarmerDetailPage() {
    const { id = '' } = useParams();
    const farmerId = Number(id);
    const query = useAdminFarmer(farmerId);
    if (query.isLoading)
        return <PageSkeleton />;
    if (query.isError || !query.data) {
        return (<EmptyState title="Stall not found" actionLabel="Try again" onAction={() => query.refetch()}/>);
    }
    const f = query.data;
    return (<div className="admin-farmer-detail-page">
      <PageHeader eyebrow="Stall account" title={f.stall_name} description={f.email} actions={<>
            <Badge>{f.status}</Badge>
            {f.status_reason ? (<span className="page-primitive__danger-sm">{f.status_reason}</span>) : null}
            <Button asChild variant="outline">
              <Link to="/admin/farmers">← Back to list</Link>
            </Button>
          </>}/>

      <div className="page-primitive__stat-grid-3">
        <Card>
          <CardHeader className="page-primitive__card-header-tight">
            <CardTitle className="page-primitive__card-title-muted">Total orders</CardTitle>
          </CardHeader>
          <CardContent className="page-primitive__stat-value">
            {f.order_stats.total}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="page-primitive__card-header-tight">
            <CardTitle className="page-primitive__card-title-muted">Completed</CardTitle>
          </CardHeader>
          <CardContent className="page-primitive__stat-value">
            {f.order_stats.completed}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="page-primitive__card-header-tight">
            <CardTitle className="page-primitive__card-title-muted">No-show</CardTitle>
          </CardHeader>
          <CardContent className="page-primitive__stat-value">
            {f.order_stats.no_show}
          </CardContent>
        </Card>
      </div>

      <div className="page-primitive__grid-2-md">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="admin-farmer-detail-page__profile-body">
            <p>{f.description}</p>
            <p>Phone: {f.phone ?? '—'}</p>
            <p>
              Market:{' '}
              {f.markets.length
            ? f.markets.map((m) => `${m.market_name} (${m.stall_label})`).join(', ')
            : 'No market assigned'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products ({f.products.length})</CardTitle>
          </CardHeader>
          <CardContent className="admin-farmer-detail-page__products">
            {f.products.length === 0 ? (<p className="page-primitive__muted-sm">No produce listed yet.</p>) : (f.products.map((p) => (<div key={p.id} className="page-primitive__product-row">
                  <span>{p.name}</span>
                  <span>
                    <PriceTag amount={p.price}/> · stock {p.stock_quantity}
                  </span>
                </div>)))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent className="admin-farmer-detail-page__history">
          {f.status_history.map((h, index) => (<div key={`${h.changed_at}-${index}`} className="page-primitive__history-item">
              <p className="page-primitive__font-medium">
                {h.from_status ?? '—'} → {h.to_status}
              </p>
              <p className="page-primitive__muted-sm">
                {formatDateTime(h.changed_at)} · {h.changed_by}
              </p>
              {h.reason ? <p className="page-primitive__mt-1">{h.reason}</p> : null}
            </div>))}
        </CardContent>
      </Card>
    </div>);
}
