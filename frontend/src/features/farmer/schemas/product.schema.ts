import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().min(2, 'Tên tối thiểu 2 ký tự'),
  category_id: z.number().min(1, 'Chọn danh mục'),
  price: z.string().min(1, 'Nhập giá'),
  unit: z.enum(['KG', 'BUNCH', 'PIECE', 'PACK']),
  stock_quantity: z.number().min(0),
  weekly_default_quantity: z.number().min(0),
  description: z.string().min(10, 'Mô tả tối thiểu 10 ký tự'),
  is_available: z.boolean(),
  image: z.string().url('URL ảnh không hợp lệ'),
});

export type ProductFormValues = z.infer<typeof productSchema>;
