import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  useArchiveProduct,
  useFarmerMyProducts,
  useMarkSoldOut,
  useUpdateFarmerStock,
} from '@/features/farmer/hooks/useFarmerProducts';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { QuantityStepper } from '@/components/common/QuantityStepper';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatVnd } from '@/utils/formatters';
import type { ProductAvailability } from '@/types';

import './FarmerProductsPage.css';

const STATE_OPTIONS: Array<{
  value: '' | 'in_stock' | 'out_of_stock' | 'unavailable' | 'hidden' | 'archived';
  label: string;
}> = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'in_stock', label: 'Còn hàng' },
  { value: 'out_of_stock', label: 'Hết hàng' },
  { value: 'unavailable', label: 'Không bán' },
  { value: 'hidden', label: 'Bị ẩn' },
  { value: 'archived', label: 'Lưu trữ' },
];

const AVAILABILITY_LABEL: Record<ProductAvailability, string> = {
  IN_STOCK: 'Còn hàng',
  OUT_OF_STOCK: 'Hết hàng',
  UNAVAILABLE: 'Không bán',
};

export default function FarmerProductsPage() {
  const [q, setQ] = useState('');
  const [state, setState] = useState<
    '' | 'in_stock' | 'out_of_stock' | 'unavailable' | 'hidden' | 'archived'
  >('');

  const query = useFarmerMyProducts({
    q: q || undefined,
    state: state || undefined,
  });

  const stockMutation = useUpdateFarmerStock();
  const outMutation = useMarkSoldOut();
  const archiveMutation = useArchiveProduct();

  return (
    <div className="farmer-products-page">
      <PageHeader
        title="Sản phẩm"
        description="Quản lý tồn kho, trạng thái và báo hết hàng."
        actions={
          <Button asChild data-write>
            <Link to="/farmer/products/new">Thêm sản phẩm</Link>
          </Button>
        }
      />

      <div className="page-primitive__actions-row">
        <Input
          placeholder="Tìm sản phẩm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="page-primitive__input-narrow"
        />
        <select
          className="page-primitive__select"
          value={state}
          onChange={(e) => {
            const v = e.target.value;
            if (
              v === '' ||
              v === 'in_stock' ||
              v === 'out_of_stock' ||
              v === 'unavailable' ||
              v === 'hidden' ||
              v === 'archived'
            ) {
              setState(v);
            }
          }}
        >
          {STATE_OPTIONS.map((s) => (
            <option key={s.value || 'all'} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading ? (
        <PageSkeleton />
      ) : query.isError ? (
        <EmptyState
          title="Không tải được sản phẩm"
          actionLabel="Thử lại"
          onAction={() => query.refetch()}
        />
      ) : !query.data?.results.length ? (
        <EmptyState title="Chưa có sản phẩm" />
      ) : (
        <div className="page-primitive__table-wrap">
          <table className="page-primitive__table page-primitive__table-min-720">
            <thead className="page-primitive__table-head">
              <tr>
                <th className="page-primitive__table-th">Sản phẩm</th>
                <th className="page-primitive__table-th">Giá</th>
                <th className="page-primitive__table-th">Tồn kho</th>
                <th className="page-primitive__table-th">Trạng thái</th>
                <th className="page-primitive__table-th">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {query.data.results.map((p) => (
                <tr key={p.id} className="page-primitive__table-row">
                  <td className="page-primitive__table-td">
                    <div className="page-primitive__row-inner">
                      {p.image ? (
                        <img src={p.image} alt="" className="page-primitive__thumb-sm" />
                      ) : (
                        <div className="page-primitive__thumb-fallback" />
                      )}
                      <div>
                        <Link
                          to={`/farmer/products/${p.id}/edit`}
                          className="page-primitive__font-medium page-primitive__link-underline"
                        >
                          {p.name}
                        </Link>
                        <p className="page-primitive__muted-xs">{p.category.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="page-primitive__table-td">
                    {formatVnd(p.price)}/{p.unit}
                  </td>
                  <td className="page-primitive__table-td">
                    <QuantityStepper
                      value={p.stock_quantity}
                      min={0}
                      onChange={(value) =>
                        stockMutation.mutate({
                          id: p.id,
                          stock_quantity: value,
                        })
                      }
                    />
                  </td>
                  <td className="page-primitive__table-td">
                    <Badge
                      variant={p.availability === 'IN_STOCK' ? 'success' : 'secondary'}
                    >
                      {AVAILABILITY_LABEL[p.availability]}
                    </Badge>
                  </td>
                  <td className="page-primitive__table-td">
                    <div className="page-primitive__actions-row">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/farmer/products/${p.id}/edit`}>Sửa</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        data-write
                        loading={outMutation.isPending}
                        onClick={() => outMutation.mutate(p.id)}
                      >
                        Báo hết
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        data-write
                        loading={archiveMutation.isPending}
                        onClick={() => archiveMutation.mutate(p.id)}
                      >
                        Lưu trữ
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
