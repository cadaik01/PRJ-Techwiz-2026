import { create } from 'zustand';

const DESKTOP_QUERY = '(min-width: 768px)';

export const isDesktop = () =>
  typeof window === 'undefined' || window.matchMedia(DESKTOP_QUERY).matches;

// Below 768px the sidebar is a drawer over the page, so it starts closed there.
export const useUIStore = create((set) => ({
  sidebarOpen: isDesktop(),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebar: (sidebarOpen) => set({ sidebarOpen }),
}));
