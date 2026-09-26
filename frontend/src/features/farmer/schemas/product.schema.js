import { z } from 'zod';
export const productSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    category_id: z.number().min(1, 'Select a category'),
    price: z.string().min(1, 'Enter a price'),
    unit: z.enum(['KG', 'BUNCH', 'PIECE', 'PACK']),
    stock_quantity: z.number().min(0),
    weekly_default_quantity: z.number().min(0),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    is_available: z.boolean(),
    image: z.string().url('Invalid image URL'),
});
