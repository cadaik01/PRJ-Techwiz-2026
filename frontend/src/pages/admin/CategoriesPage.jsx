import { Eye, EyeOff, Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { EmptyState } from '../../components/feedback/EmptyState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { PageSkeleton } from '../../components/feedback/PageSkeleton';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { CategoryFormDialog } from '../../features/categories/CategoryFormDialog';
import { CategoryIcon } from '../../features/categories/CategoryIcon';
import {
  useAdminCategories,
  useDeleteCategory,
  useUpdateCategory,
} from '../../features/categories/useAdminCategories';

// A-07 · Danh mục sản phẩm (FR-56). A category in use cannot be deleted, only hidden.
export function CategoriesPage() {
  const { data: categories, isLoading, isError, error, refetch } = useAdminCategories();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const openForm = (category = null) => {
    setEditing(category);
    setFormOpen(true);
  };

  const columns = useMemo(
    () => [
      { header: 'Tên danh mục', accessorKey: 'name' },
      {
        header: 'Biểu tượng',
        accessorKey: 'icon',
        enableSorting: false,
        cell: ({ getValue }) => <CategoryIcon name={getValue()} className="size-5 text-slate-600" />,
      },
      { header: 'Số sản phẩm', accessorKey: 'product_count' },
      { header: 'Thứ tự hiển thị', accessorKey: 'display_order' },
      {
        header: 'Trạng thái',
        accessorKey: 'is_active',
        cell: ({ getValue }) =>
          getValue() ? <Badge tone="success">Hiển thị</Badge> : <Badge>Đã ẩn</Badge>,
      },
      {
        header: 'Hành động',
        id: 'actions',
        enableSorting: false,
        cell: ({ row: { original: category } }) => (
          <div className="flex flex-wrap justify-end gap-1 md:justify-start">
            <Button size="sm" variant="ghost" onClick={() => openForm(category)}>
              <Pencil className="size-4" aria-hidden="true" /> Sửa
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={update.isPending}
              onClick={() => update.mutate({ id: category.id, is_active: !category.is_active })}
            >
              {category.is_active ? (
                <>
                  <EyeOff className="size-4" aria-hidden="true" /> Ẩn
                </>
              ) : (
                <>
                  <Eye className="size-4" aria-hidden="true" /> Hiện
                </>
              )}
            </Button>
            {category.product_count === 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                onClick={() => setDeleting(category)}
              >
                <Trash2 className="size-4" aria-hidden="true" /> Xóa
              </Button>
            )}
          </div>
        ),
      },
    ],
    [update],
  );

  const confirmDelete = () =>
    remove.mutate(deleting.id, { onSettled: () => setDeleting(null) });

  let content;
  if (isLoading) {
    content = <PageSkeleton rows={4} className="p-0" />;
  } else if (isError) {
    content = <ErrorState error={error} onRetry={refetch} />;
  } else if (!categories.length) {
    content = (
      <EmptyState
        icon={Tags}
        title="Chưa có danh mục nào"
        description="Tạo danh mục để nông dân phân loại sản phẩm."
        actionLabel="Thêm danh mục"
        onAction={() => openForm()}
      />
    );
  } else {
    content = <Table columns={columns} data={categories} />;
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Danh mục sản phẩm</h1>
          <p className="text-sm text-slate-600">
            Danh mục đang có sản phẩm không xóa được, chỉ có thể ẩn khỏi form tạo sản phẩm.
          </p>
        </div>
        <Button onClick={() => openForm()}>
          <Plus className="size-4" aria-hidden="true" /> Thêm danh mục
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">{content}</div>

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xóa danh mục?"
        description={deleting && `Danh mục "${deleting.name}" sẽ bị xóa vĩnh viễn.`}
        confirmLabel="Xóa"
        tone="danger"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
