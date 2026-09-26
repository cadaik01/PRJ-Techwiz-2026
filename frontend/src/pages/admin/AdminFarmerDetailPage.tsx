import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useAdminFarmer, useUpdateFarmer } from '@/hooks/queries/admin/useAdminFarmers';
import { ProfileEditDialog } from '@/components/admin/ProfileEditDialog';
import { EmptyState } from '@/components/common/feedback/EmptyState';
import { PageHeader } from '@/components/common/layout/PageHeader';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { PriceTag } from '@/components/common/badges/PriceTag';
import { Badge } from '@/components/common/badges/Badge';
import { Button } from '@/components/common/forms/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/cards/Card';
import { formatDateTime } from '@/utils/formatters';
import { farmerStatusLabel } from '@/utils/labels';

import './AdminFarmerDetailPage.css';

export default function AdminFarmerDetailPage() {
  const { id = '' } = useParams();
  const farmerId = Number(id);
  const query = useAdminFarmer(farmerId);
  const update = useUpdateFarmer(farmerId);
  const [editing, setEditing] = useState(false);

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) {
    return (
      <EmptyState
        title="Stall not found"
        actionLabel="Try again"
        onAction={() => query.refetch()}
      />
    );
  }

  const f = query.data;

  return (
    <div className="admin-farmer-detail-page">
      <PageHeader
        title={f.stall_name}
        description={f.email}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit details
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/farmers">← Back to list</Link>
            </Button>
          </>
        }
      />

      <ProfileEditDialog
        open={editing}
        onOpenChange={setEditing}
        title="Edit stall details"
        note="Trading days, address and location are managed by the stall on its own profile."
        pending={update.isPending}
        onSave={(values) => update.mutateAsync(values)}
        fields={[
          { name: 'stall_name', label: 'Stall name', value: f.stall_name },
          { name: 'contact_person', label: 'Contact person', value: f.contact_person ?? '' },
          { name: 'phone', label: 'Phone', value: f.phone ?? '', type: 'tel' },
          { name: 'description', label: 'Description', value: f.description ?? '', multiline: true },
        ]}
      />

      <div className="page-primitive__actions-row">
        <Badge>{farmerStatusLabel(f.status)}</Badge>
        {f.status_reason ? (
          <span className="page-primitive__danger-sm">{f.status_reason}</span>
        ) : null}
      </div>

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
            {f.products.length === 0 ? (
              <p className="page-primitive__muted-sm">No produce listed yet.</p>
            ) : (
              f.products.map((p) => (
                <div key={p.id} className="page-primitive__product-row">
                  <span>{p.name}</span>
                  <span>
                    <PriceTag amount={p.price} /> · stock {p.stock_quantity}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent className="admin-farmer-detail-page__history">
          {f.status_history.map((h, index) => (
            <div
              key={`${h.changed_at}-${index}`}
              className="page-primitive__history-item"
            >
              <p className="page-primitive__font-medium">
                {/* No from_status means the very first row: the stall registering, not a move. */}
                {h.from_status
                  ? `${farmerStatusLabel(h.from_status)} → ${farmerStatusLabel(h.to_status)}`
                  : `Registered · ${farmerStatusLabel(h.to_status)}`}
              </p>
              <p className="page-primitive__muted-sm">
                {formatDateTime(h.changed_at)} · {h.changed_by}
              </p>
              {h.reason ? <p className="page-primitive__mt-1">{h.reason}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
