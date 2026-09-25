import { useState } from 'react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import { cn } from '@/lib/cn';
import {
  fetchCustomerImpact,
  useActivateCustomer,
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
import { Textarea } from '@/components/ui/Textarea';

import './AdminCustomersPage.css';

export default function AdminCustomersPage() {
  const [q, setQ] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');
  const [deactivateId, setDeactivateId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [impactText, setImpactText] = useState('');

  const query = useAdminCustomers({ q: submittedQ || undefined });
  const deactivate = useDeactivateCustomer();
  const activate = useActivateCustomer();

  const openDeactivate = async (id: number) => {
    try {
      const impact = await fetchCustomerImpact(id);
      setImpactText(`Ảnh hưởng: ${impact.open_order_count} đơn mở sẽ bị ảnh hưởng.`);
      setDeactivateId(id);
      setReason('');
    } catch (e) {
      toast.error(ApiError.fromUnknown(e).friendlyMessage);
    }
  };

  return (
    <div className="admin-customers-page">
      <PageHeader title="Khách hàng" description="Khóa/mở khóa và theo dõi no-show." />
      <form
        className="page-primitive__actions-row"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedQ(q);
        }}
      >
        <Input
          placeholder="Tìm email / tên"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="page-primitive__input-narrow"
        />
        <Button type="submit" size="sm">
          Tìm
        </Button>
      </form>

      {query.isLoading ? (
        <PageSkeleton />
      ) : !query.data?.results.length ? (
        <EmptyState title="Không có khách hàng" />
      ) : (
        <div className="page-primitive__table-wrap">
          <table className="page-primitive__table page-primitive__table-min-720">
            <thead className="page-primitive__table-head">
              <tr>
                <th className="page-primitive__table-th">Khách</th>
                <th className="page-primitive__table-th">Đơn</th>
                <th className="page-primitive__table-th">No-show</th>
                <th className="page-primitive__table-th">Trạng thái</th>
                <th className="page-primitive__table-th">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.data.results.map((c) => (
                <tr key={c.id} className="page-primitive__table-row">
                  <td className="page-primitive__table-td">
                    <p className="page-primitive__font-medium">{c.full_name}</p>
                    <p className="page-primitive__muted-xs">{c.email}</p>
                  </td>
                  <td className="page-primitive__table-td">{c.order_count}</td>
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
                      {c.is_active ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>
                  </td>
                  <td className="page-primitive__table-td">
                    {c.is_active ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openDeactivate(c.id)}
                      >
                        Khóa
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => activate.mutate(c.id)}>
                        Mở khóa
                      </Button>
                    )}
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
        title="Khóa khách hàng"
        description={impactText}
        destructive
        loading={deactivate.isPending}
        onConfirm={() => {
          if (!deactivateId || reason.trim().length < 3) {
            toast.error('Nhập lý do khóa');
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
          placeholder="Lý do khóa…"
        />
      </ConfirmDialog>
    </div>
  );
}
