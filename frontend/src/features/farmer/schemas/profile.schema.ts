import { z } from 'zod';

export const farmerProfileSchema = z.object({
  stall_name: z.string().min(2, 'Tên quầy tối thiểu 2 ký tự'),
  contact_person: z.string().min(1, 'Vui lòng nhập người liên hệ'),
  phone: z.string().regex(/^(0|\+84)(3|5|7|8|9)\d{8}$/, 'SĐT Việt Nam không hợp lệ'),
  address: z.string().min(1, 'Vui lòng nhập địa chỉ'),
  description: z.string().min(10, 'Giới thiệu tối thiểu 10 ký tự'),
});

export type FarmerProfileFormValues = z.infer<typeof farmerProfileSchema>;
