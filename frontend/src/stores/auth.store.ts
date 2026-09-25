import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { STORAGE_KEYS } from '@/config/constants';
import type { Role } from '@/types';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  role: Role | null;
  setTokens: (tokens: { access: string; refresh: string; role?: Role }) => void;
  setAccessToken: (access: string) => void;
  setRole: (role: Role | null) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      role: null,

      setTokens: ({ access, refresh, role }) => {
        try {
          localStorage.setItem(STORAGE_KEYS.ACCESS, access);
          localStorage.setItem(STORAGE_KEYS.REFRESH, refresh);
        } catch {
          // Storage unavailable: keep in memory.
        }
        set({
          accessToken: access,
          refreshToken: refresh,
          role: role ?? null,
        });
      },

      setAccessToken: (access) => {
        try {
          localStorage.setItem(STORAGE_KEYS.ACCESS, access);
        } catch {
          // Storage unavailable: keep in memory.
        }
        set({ accessToken: access });
      },

      setRole: (role) => set({ role }),

      clearSession: () => {
        try {
          localStorage.removeItem(STORAGE_KEYS.ACCESS);
          localStorage.removeItem(STORAGE_KEYS.REFRESH);
        } catch {
          // Nothing to clear.
        }
        set({ accessToken: null, refreshToken: null, role: null });
      },
    }),
    {
      name: 'marketlink-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        role: state.role,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        try {
          if (state.accessToken) {
            localStorage.setItem(STORAGE_KEYS.ACCESS, state.accessToken);
          }
          if (state.refreshToken) {
            localStorage.setItem(STORAGE_KEYS.REFRESH, state.refreshToken);
          }
        } catch {
          // Ignore.
        }
      },
    },
  ),
);
