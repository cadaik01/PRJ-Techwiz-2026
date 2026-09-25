import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Nhập tên danh mục'),
  icon: z.string().min(1, 'Nhập icon'),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
