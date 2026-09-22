import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  items: [],
  unreadCount: 0,

  // Replaces the list after a fetch.
  setItems: (items) =>
    set({ items, unreadCount: items.filter((item) => !item.is_read).length }),

  // Prepends one notification arriving over the WebSocket.
  prepend: (item) =>
    set((state) => ({
      items: [item, ...state.items],
      unreadCount: state.unreadCount + 1,
    })),

  markRead: (id) =>
    set((state) => {
      const items = state.items.map((item) =>
        item.id === id ? { ...item, is_read: true } : item,
      );
      return { items, unreadCount: items.filter((item) => !item.is_read).length };
    }),

  markAllRead: () =>
    set((state) => ({
      items: state.items.map((item) => ({ ...item, is_read: true })),
      unreadCount: 0,
    })),
}));
