import { create } from 'zustand';

import { STORAGE_KEYS } from '../config/constants';

// Holds tokens only. The profile itself lives in the React Query cache under
// QUERY_KEYS.ME, so there is one source of truth and nothing to keep in sync.

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export const useAuthStore = create((set) => ({
  accessToken: read(STORAGE_KEYS.ACCESS),

  setTokens: ({ access, refresh }) => {
    try {
      if (access) localStorage.setItem(STORAGE_KEYS.ACCESS, access);
      if (refresh) localStorage.setItem(STORAGE_KEYS.REFRESH, refresh);
    } catch {
      // Storage unavailable: the session lives in memory for this tab only.
    }
    set({ accessToken: access ?? null });
  },

  clearTokens: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS);
      localStorage.removeItem(STORAGE_KEYS.REFRESH);
    } catch {
      // Nothing to clear.
    }
    set({ accessToken: null });
  },
}));
