import { useState } from 'react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { cn } from '@/lib/cn';
import {
  fetchCustomerImpact,
  useActivateCustomer,
  useAdminCustomer,
  useAdminCustomers,
  useDeactivateCustomer,
} from '@/features/admin/hooks/useAdminCustomers';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { Textarea } from '@/components/ui/Textarea';
import { formatDate, formatMoney } from '@/utils/formatters';

import './AdminCustomersPage.css';

// AD-12 requires 5 to 500 characters; checking here saves a round trip.
const REASON_MIN_LENGTH = 5;

export default function AdminCustomersPage() {
  const [q, setQ] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [impactText, setImpactText] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);

  const query = useAdminCustomers({ q: submittedQ || undefined });
  const deactivate = useDeactivateCustomer();
  const activate = useActivateCustomer();
  const detail = useAdminCustomer(detailId);

  const openDeactivate = async (id: number) => {
    try {
      const impact = await fetchCustomerImpact(id);
      setImpactText(
        `${impact.open_orders.total} open orders will be cancelled. Stock of the ${impact.open_orders.ACCEPTED + impact.open_orders.READY_FOR_PICKUP} accepted orders goes back to ${impact.affected_farmers} farmers.`,
      );
      setDeactivateId(id);
      setReason('');
    } catch (e) {
      toast.error(ApiError.fromUnknown(e).friendlyMessage);
    }
  };

  return (
    <div className="admin-customers-page">
      <PageHeader
        title="Customers"
        description="Lock or unlock accounts and monitor no-show history."
      />
      <form
        className="page-primitive__actions-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedQ(q);
        }}
      >
        <Input
          label="Search email / name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="page-primitive__input-narrow"
        />
        <Button type="submit" size="sm">
          Search
        </Button>
      </form>

      {query.isLoading ? (
        <PageSkeleton />
      ) : !query.data?.results.length ? (
        <EmptyState title="No customers to show" />
      ) : (
        <div className="page-primitive__table-wrap">
          <table className="page-primitive__table page-primitive__table-min-720">
            <thead className="page-primitive__table-head">
              <tr>
                <th className="page-primitive__table-th">Customer</th>
                <th className="page-primitive__table-th">Orders</th>
                <th className="page-primitive__table-th">No-show</th>
                <th className="page-primitive__table-th">Status</th>
                <th className="page-primitive__table-th">Lock reason</th>
                <th className="page-primitive__table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {query.data.results.map((c) => (
                <tr key={c.id} className="page-primitive__table-row">
                  <td className="page-primitive__table-td">
                    <p className="page-primitive__font-medium">{c.full_name}</p>
                    <p className="page-primitive__muted-xs">{c.email}</p>
                  </td>
                  <td className="page-primitive__table-td">{c.total_orders}</td>
                  <td className="page-primitive__table-td">
                    <span
                      className={cn(
                        c.no_show_count >= 3 && 'page-primitive__no-show-warn',
                      )}
                    >
                      {c.no_show_count}
                    </span>
                  </td>
                  <td className="page-primitive__table-td">
                    <Badge variant={c.is_active ? 'success' : 'danger'}>
                      {c.is_active ? 'Active' : 'Locked'}
                    </Badge>
                    {c.at_risk ? (
                      <Badge variant="warning" className="admin-customers-page__risk">
                        At risk
                      </Badge>
                    ) : null}
                  </td>
                  <td className="page-primitive__table-td page-primitive__muted-xs">
                    {c.deactivation_reason ?? '—'}
                  </td>
                  <td className="page-primitive__table-td">
                    {c.is_active ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDeactivate(c.id)}
                      >
                        Lock
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => activate.mutate(c.id)}>
                        Unlock
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailId(c.id)}
                    >
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deactivateId)}
        onOpenChange={(open) => {
          if (!open) setDeactivateId(null);
        }}
        title="Lock this customer"
        description={impactText}
        destructive
        loading={deactivate.isPending}
        onConfirm={() => {
          if (!deactivateId || reason.trim().length < REASON_MIN_LENGTH) {
            toast.error(`Lock reason must be at least ${REASON_MIN_LENGTH} characters`);
            return;
          }
          deactivate.mutate(
            { id: deactivateId, reason },
            {
              onSuccess: () => setDeactivateId(null),
            },
          );
        }}
      >
        <Textarea
          className="admin-customers-page__dialog-field"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Lock reason…"
        />
      </ConfirmDialog>

      <Sheet
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      >
        <SheetContent className="page-primitive__sheet-md">
          <SheetHeader>
            <SheetTitle>Customer details</SheetTitle>
          </SheetHeader>
          {detail.isLoading ? (
            <PageSkeleton />
          ) : detail.data ? (
            <div className="admin-customers-page__detail">
              <p className="page-primitive__font-medium">{detail.data.full_name}</p>
              <p className="page-primitive__muted-xs">{detail.data.email}</p>
              <p className="page-primitive__muted-xs">{detail.data.phone}</p>
              <p className="page-primitive__muted-xs">{detail.data.address}</p>
              <p className="page-primitive__muted-xs">
                Joined {formatDate(detail.data.date_joined)} · {detail.data.total_orders} orders ·{' '}
                {detail.data.open_orders} open · {detail.data.no_show_count} no-show
              </p>

              <p className="page-primitive__font-medium">Recent orders</p>
              {detail.data.recent_orders.length === 0 ? (
                <p className="page-primitive__muted-xs">No orders yet.</p>
              ) : (
                <ul className="admin-customers-page__orders">
                  {detail.data.recent_orders.map((order) => (
                    <li key={order.id} className="admin-customers-page__order">
                      <span>#{order.id}</span>
                      <span>{order.status}</span>
                      <span>{formatDate(order.pickup_date)}</span>
                      <span>{formatMoney(order.total_amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
