import { z } from 'zod';

export const announcementSchema = z.object({
  title: z.string().min(1, 'Nhập tiêu đề'),
  content: z.string().min(1, 'Nhập nội dung'),
  audience: z.enum(['ALL', 'CUSTOMER', 'FARMER']),
  starts_at: z.string().min(1, 'Chọn thời điểm bắt đầu'),
  is_active: z.boolean(),
});

export type AnnouncementFormValues = z.infer<typeof announcementSchema>;
