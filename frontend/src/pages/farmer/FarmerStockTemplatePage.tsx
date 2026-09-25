import { Link } from 'react-router-dom';
import { useState } from 'react';

import {
  useApplyStockTemplate,
  useStockTemplatePreview,
} from '@/features/farmer/hooks/useFarmerProducts';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { Button } from '@/components/ui/Button';

import './FarmerStockTemplatePage.css';

export default function FarmerStockTemplatePage() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const previewQuery = useStockTemplatePreview();
  const applyMutation = useApplyStockTemplate();

  if (previewQuery.isLoading) return <PageSkeleton />;
  if (previewQuery.isError || !previewQuery.data) {
    return (
      <EmptyState
        title="Không tải được mẫu tồn kho"
        actionLabel="Thử lại"
        onAction={() => previewQuery.refetch()}
      />
    );
  }

  const preview = previewQuery.data;

  return (
    <div className="farmer-stock-template-page">
      <PageHeader
        title="Mẫu tồn kho tuần"
        description="Xem trước thay đổi tồn hiện tại → tồn mặc định tuần, rồi áp dụng."
        actions={
          <Button
            data-write
            disabled={!preview.can_apply}
            onClick={() => setConfirmOpen(true)}
          >
            Áp dụng mẫu tuần
          </Button>
        }
      />

      {preview.overdue_orders.length > 0 ? (
        <div className="page-primitive__warn-panel">
          <p className="page-primitive__semibold">
            Cần xử lý {preview.overdue_orders.length} đơn quá hạn trước khi áp dụng
          </p>
          <ul className="page-primitive__warn-list page-primitive__list-plain">
            {preview.overdue_orders.map((o) => (
              <li key={o.id}>
                <Link
                  className="page-primitive__link-underline"
                  to={`/farmer/orders/${o.id}`}
                >
                  {o.id} · {o.customer.full_name}
                </Link>
              </li>
            ))}
          </ul>
          <Button asChild size="sm" className="page-primitive__mt-3" variant="outline">
            <Link to="/farmer/orders?tab=overdue">Xử lý đơn quá hạn</Link>
          </Button>
        </div>
      ) : null}

      <div className="page-primitive__table-wrap">
        <table className="page-primitive__table">
          <thead className="page-primitive__table-head">
            <tr>
              <th className="page-primitive__table-th">Sản phẩm</th>
              <th className="page-primitive__table-th">Tồn hiện tại</th>
              <th className="page-primitive__table-th">Tồn mới</th>
              <th className="page-primitive__table-th">Đang giữ</th>
            </tr>
          </thead>
          <tbody>
            {preview.changes.map((row) => (
              <tr key={row.product_id} className="page-primitive__table-row">
                <td className="page-primitive__table-td page-primitive__font-medium">
                  {row.product_name}
                </td>
                <td className="page-primitive__table-td">{row.current_stock}</td>
                <td className="page-primitive__table-td page-primitive__primary-emphasis">
                  {row.new_stock}
                </td>
                <td className="page-primitive__table-td">{row.held_quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Áp dụng mẫu tồn kho tuần?"
        description="Tồn kho sẽ được đặt lại theo giá trị mặc định tuần."
        loading={applyMutation.isPending}
        onConfirm={() =>
          applyMutation.mutate(undefined, {
            onSuccess: () => setConfirmOpen(false),
          })
        }
      />
    </div>
  );
}
