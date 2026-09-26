import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/config/constants';

export type CartItem = {
  product_id: number;
  farmer_id: number;
  farmer_name: string;
  name: string;
  unit: string;
  price: string;
  quantity: number;
  image: string | null;
  is_available: boolean;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clear: () => void;
  clearFarmer: (farmerId: number) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existing = get().items.find((i) => i.product_id === item.product_id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.product_id === item.product_id
                ? { ...i, quantity: i.quantity + item.quantity }
                : i,
            ),
          });
          return;
        }
        set({ items: [...get().items, item] });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.product_id !== productId) });
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product_id === productId ? { ...i, quantity } : i,
          ),
        });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.product_id !== productId) });
      },

      clear: () => set({ items: [] }),

      clearFarmer: (farmerId) => {
        set({ items: get().items.filter((i) => i.farmer_id !== farmerId) });
      },
    }),
    { name: STORAGE_KEYS.CART },
  ),
);
