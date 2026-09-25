import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/config/constants';

type GeoState = {
  latitude: number | null;
  longitude: number | null;
  label: string | null;
  setCoords: (latitude: number, longitude: number, label?: string) => void;
  clear: () => void;
};

export const useGeoStore = create<GeoState>()(
  persist(
    (set) => ({
      latitude: null,
      longitude: null,
      label: null,
      setCoords: (latitude, longitude, label) =>
        set({ latitude, longitude, label: label ?? 'Vị trí của tôi' }),
      clear: () => set({ latitude: null, longitude: null, label: null }),
    }),
    { name: STORAGE_KEYS.GEO },
  ),
);
