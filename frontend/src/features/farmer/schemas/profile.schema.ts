import { z } from 'zod';

export const farmerProfileSchema = z.object({
  stall_name: z.string().min(2, 'Stall name must be at least 2 characters'),
  contact_person: z.string().min(1, 'Please enter a contact person'),
  phone: z.string().regex(/^(0|\+84)(3|5|7|8|9)\d{8}$/, 'Invalid Vietnamese phone number'),
  address: z.string().min(1, 'Please enter an address'),
  description: z.string().min(10, 'About must be at least 10 characters'),
});

export type FarmerProfileFormValues = z.infer<typeof farmerProfileSchema>;
