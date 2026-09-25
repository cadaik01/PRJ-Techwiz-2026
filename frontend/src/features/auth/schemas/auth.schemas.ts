import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ')
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

const phoneSchema = z
  .string()
  .regex(/^(0|\+84)(3|5|7|8|9)\d{8}$/, 'Số điện thoại Việt Nam không hợp lệ');

const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu tối thiểu 8 ký tự')
  .regex(/[A-Za-z]/, 'Mật khẩu cần có chữ')
  .regex(/\d/, 'Mật khẩu cần có số');

export const registerCustomerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Vui lòng nhập email')
      .email('Email không hợp lệ')
      .transform((v) => v.toLowerCase()),
    full_name: z.string().min(1, 'Vui lòng nhập họ tên'),
    phone: phoneSchema,
    address: z.string().min(5, 'Vui lòng nhập địa chỉ'),
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirm_password'],
  });

export type RegisterCustomerValues = z.infer<typeof registerCustomerSchema>;

export const registerFarmerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Vui lòng nhập email')
      .email('Email không hợp lệ')
      .transform((v) => v.toLowerCase()),
    stall_name: z.string().min(2, 'Tên quầy tối thiểu 2 ký tự'),
    contact_person: z.string().min(1, 'Vui lòng nhập người liên hệ'),
    phone: phoneSchema,
    address: z.string().min(5, 'Vui lòng nhập địa chỉ'),
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirm_password'],
  });

export type RegisterFarmerValues = z.infer<typeof registerFarmerSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirm_password'],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
