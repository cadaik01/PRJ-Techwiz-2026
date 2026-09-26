import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Please enter your email')
    .email('Invalid email')
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Please enter your password'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

const phoneSchema = z
  .string()
  .regex(/^(0|\+84)(3|5|7|8|9)\d{8}$/, 'Invalid Vietnamese phone number');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must include a letter')
  .regex(/\d/, 'Password must include a number');

export const registerCustomerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Please enter your email')
      .email('Invalid email')
      .transform((v) => v.toLowerCase()),
    full_name: z.string().min(1, 'Please enter your full name'),
    phone: phoneSchema,
    address: z.string().min(5, 'Please enter your address'),
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type RegisterCustomerValues = z.infer<typeof registerCustomerSchema>;

export const registerFarmerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Please enter your email')
      .email('Invalid email')
      .transform((v) => v.toLowerCase()),
    stall_name: z.string().min(2, 'Stall name must be at least 2 characters'),
    contact_person: z.string().min(1, 'Please enter a contact person'),
    phone: phoneSchema,
    address: z.string().min(5, 'Please enter your address'),
    password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type RegisterFarmerValues = z.infer<typeof registerFarmerSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Please enter your current password'),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
