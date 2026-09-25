import { z } from 'zod';

export const profileSchema = z.object({
  full_name: z.string().min(1, 'Vui lòng nhập họ tên'),
  phone: z
    .string()
    .regex(/^(0|\+84)(3|5|7|8|9)\d{8}$/, 'Số điện thoại Việt Nam không hợp lệ'),
  address: z.string().min(1, 'Vui lòng nhập địa chỉ'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
