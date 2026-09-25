import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ApiError } from '@/lib/ApiError';
import {
  fetchFarmerImpact,
  useAdminFarmers,
  useApproveFarmer,
  useReinstateFarmer,
  useRejectFarmer,
  useSuspendFarmer,
} from '@/features/admin/hooks/useAdminFarmers';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { FarmerStatus } from '@/types';

import './AdminFarmersPage.css';

const STATUS_OPTIONS: Array<{ value: FarmerStatus; label: string }> = [
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'SUSPENDED', label: 'Tạm khóa' },
];

function statusLabel(status: FarmerStatus) {
  if (status === 'PENDING') return 'Chờ duyệt';
  if (status === 'APPROVED') return 'Đã duyệt';
  if (status === 'REJECTED') return 'Từ chối';
  return 'Tạm khóa';
}

function isStatus(v: string | null): v is FarmerStatus {
  return v === 'PENDING' || v === 'APPROVED' || v === 'REJECTED' || v === 'SUSPENDED';
}

export default function AdminFarmersPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get('status');
  const status = isStatus(statusParam) ? statusParam : undefined;
  const [q, setQ] = useState(params.get('q') ?? '');
  const [page, setPage] = useState(1);

  const [rejectId, setRejectId] = useState<number | null>(null);
  const [suspendId, setSuspendId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [impactText, setImpactText] = useState('');

  const query = useAdminFarmers({
    q: params.get('q') || undefined,
    status,
    page,
    page_size: 10,
  });

  const approve = useApproveFarmer();
  const reject = useRejectFarmer();
  const suspend = useSuspendFarmer();
  const reinstate = useReinstateFarmer();

  const openSuspend = async (id: number) => {
    try {
      const impact = await fetchFarmerImpact(id);
      setImpactText(
        `Ảnh hưởng: ${impact.open_order_count} đơn mở, ${impact.affected_customer_count} khách hàng.`,
      );
      setSuspendId(id);
      setReason('');
    } catch (e) {
      toast.error(ApiError.fromUnknown(e).friendlyMessage);
    }
  };

  return (
    <div className="admin-farmers-page">
      <PageHeader
        title="Nông dân"
        description="Duyệt, tạm khóa và khôi phục hồ sơ quầy."
      />

      <form
        className="page-primitive__actions-row"
        onSubmit={(e) => {
          e.preventDefault();
          const next = new URLSearchParams(params);
          if (q) next.set('q', q);
          else next.delete('q');
          setParams(next);
          setPage(1);
        }}
      >
        <Input
          placeholder="Tìm quầy / email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="page-primitive__input-narrow"
        />
        <select
          className="page-primitive__select"
          value={status ?? ''}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set('status', e.target.value);
            else next.delete('status');
            setParams(next);
            setPage(1);
          }}
        >
          <option value="">Mọi trạng thái</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Lọc
        </Button>
      </form>

      {query.isLoading ? (
        <PageSkeleton />
      ) : query.isError ? (
        <EmptyState
          title="Không tải được danh sách"
          actionLabel="Thử lại"
          onAction={() => query.refetch()}
        />
      ) : !query.data?.results.length ? (
        <EmptyState title="Không có nông dân" />
      ) : (
        <>
          <div className="page-primitive__table-wrap">
            <table className="page-primitive__table page-primitive__table-min-800">
              <thead className="page-primitive__table-head">
                <tr>
                  <th className="page-primitive__table-th">Quầy</th>
                  <th className="page-primitive__table-th">Liên hệ</th>
                  <th className="page-primitive__table-th">Trạng thái</th>
                  <th className="page-primitive__table-th">Đơn mở</th>
                  <th className="page-primitive__table-th">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {query.data.results.map((f) => (
                  <tr key={f.id} className="page-primitive__table-row">
                    <td className="page-primitive__table-td">
                      <Link
                        to={`/admin/farmers/${f.id}`}
                        className="page-primitive__link"
                      >
                        {f.stall_name}
                      </Link>
                      <p className="page-primitive__muted-xs">{f.email}</p>
                    </td>
                    <td className="page-primitive__table-td">
                      <p>{f.email}</p>
                      <p className="page-primitive__muted-xs">{f.phone}</p>
                    </td>
                    <td className="page-primitive__table-td">
                      <Badge>{statusLabel(f.status)}</Badge>
                    </td>
                    <td className="page-primitive__table-td">{f.open_order_count}</td>
                    <td className="page-primitive__table-td">
                      <div className="page-primitive__actions-row">
                        {f.status === 'PENDING' ? (
                          <>
                            <Button size="sm" onClick={() => approve.mutate(f.id)}>
                              Duyệt
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRejectId(f.id);
                                setReason('');
                              }}
                            >
                              Từ chối
                            </Button>
                          </>
                        ) : null}
                        {f.status === 'APPROVED' ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openSuspend(f.id)}
                          >
                            Tạm khóa
                          </Button>
                        ) : null}
                        {f.status === 'SUSPENDED' || f.status === 'REJECTED' ? (
                          <Button size="sm" onClick={() => reinstate.mutate(f.id)}>
                            Khôi phục
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-farmers-page__pagination">
            <span>
              Trang {query.data.page}/{query.data.total_pages} · {query.data.count} hồ sơ
            </span>
            <div className="page-primitive__actions-row">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Trước
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= query.data.total_pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau
              </Button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(rejectId)}
        onOpenChange={(open) => {
          if (!open) setRejectId(null);
        }}
        title="Từ chối hồ sơ"
        description="Nhập lý do từ chối (tối thiểu 5 ký tự)."
        destructive
        loading={reject.isPending}
        onConfirm={() => {
          if (!rejectId || reason.trim().length < 5) {
            toast.error('Lý do tối thiểu 5 ký tự');
            return;
          }
          reject.mutate(
            { id: rejectId, reason },
            {
              onSuccess: () => {
                setRejectId(null);
                setReason('');
              },
            },
          );
        }}
      >
        <Textarea
          className="admin-farmers-page__dialog-field"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(suspendId)}
        onOpenChange={(open) => {
          if (!open) setSuspendId(null);
        }}
        title="Tạm khóa nông dân"
        description={impactText}
        destructive
        loading={suspend.isPending}
        onConfirm={() => {
          if (!suspendId || reason.trim().length < 5) {
            toast.error('Lý do tối thiểu 5 ký tự');
            return;
          }
          suspend.mutate(
            { id: suspendId, reason },
            {
              onSuccess: () => {
                setSuspendId(null);
                setReason('');
              },
            },
          );
        }}
      >
        <Textarea
          className="admin-farmers-page__dialog-field"
          placeholder="Lý do tạm khóa…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </ConfirmDialog>
    </div>
  );
}
