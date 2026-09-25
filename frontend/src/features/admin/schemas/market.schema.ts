import { z } from 'zod';

const dayOfWeekSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

export const marketSchema = z.object({
  name: z.string().min(1, 'Nhập tên chợ'),
  address: z.string().min(1, 'Nhập địa chỉ'),
  latitude: z.number(),
  longitude: z.number(),
  image: z.string(),
  open_time: z.string().min(1, 'Chọn giờ mở'),
  close_time: z.string().min(1, 'Chọn giờ đóng'),
  operating_days: z.array(dayOfWeekSchema).min(1, 'Chọn ít nhất một ngày'),
  description: z.string(),
});

export type MarketFormValues = z.infer<typeof marketSchema>;
