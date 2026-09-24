import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { cn } from '../../lib/utils';
import { CATEGORY_ICONS } from './categoryIcons';
import { useCreateCategory, useUpdateCategory } from './useAdminCategories';

// Rules of A-07, repeated by the backend serializer.
const schema = z.object({
  name: z.string().trim().min(2, 'Vui lòng nhập 2–50 ký tự').max(50, 'Vui lòng nhập 2–50 ký tự'),
  icon: z.string().nullable(),
  display_order: z
    .number({ error: 'Thứ tự phải là số nguyên từ 0 trở lên' })
    .int('Thứ tự phải là số nguyên từ 0 trở lên')
    .min(0, 'Thứ tự phải là số nguyên từ 0 trở lên')
    .max(32767, 'Thứ tự tối đa là 32767'),
  is_active: z.boolean(),
});

const EMPTY = { name: '', icon: null, display_order: 0, is_active: true };

// `category` null means create; otherwise edit that row.
export function CategoryFormDialog({ open, onOpenChange, category }) {
  const isEdit = Boolean(category);
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const saving = create.isPending || update.isPending;

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: EMPTY });

  useEffect(() => {
    if (open) {
      reset(category ? { ...EMPTY, ...category } : EMPTY);
    }
  }, [open, category, reset]);

  const onServerError = (error) => {
    Object.entries(error.fieldErrors ?? {}).forEach(([field, messages]) => {
      setError(field, { message: messages[0] });
    });
  };

  const onSubmit = ({ name, icon, display_order, is_active }) => {
    const options = { onSuccess: () => onOpenChange(false), onError: onServerError };
    if (isEdit) {
      update.mutate({ id: category.id, name, icon, display_order, is_active }, options);
    } else {
      // is_active is not accepted on create (AD-18): a new category starts visible.
      create.mutate({ name, icon, display_order }, options);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Sửa danh mục' : 'Thêm danh mục'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Input label="Tên danh mục *" autoFocus error={errors.name?.message} {...register('name')} />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-slate-700">Biểu tượng</legend>
          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <div role="radiogroup" className="grid grid-cols-6 gap-2 sm:grid-cols-9">
                {Object.entries(CATEGORY_ICONS).map(([iconName, Icon]) => {
                  const selected = field.value === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={iconName}
                      title={iconName}
                      onClick={() => field.onChange(selected ? null : iconName)}
                      className={cn(
                        'flex h-9 items-center justify-center rounded-md border transition',
                        selected
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
          />
        </fieldset>

        <Input
          label="Thứ tự hiển thị"
          type="number"
          min={0}
          inputMode="numeric"
          error={errors.display_order?.message}
          {...register('display_order', { valueAsNumber: true })}
        />

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="size-4" {...register('is_active')} />
            Đang hiển thị (bỏ chọn để ẩn khỏi form tạo sản phẩm)
          </label>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Lưu' : 'Thêm'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
