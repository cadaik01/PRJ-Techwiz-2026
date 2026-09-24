import { Menu } from 'lucide-react';

import { useUIStore } from '../../stores/useUIStore';
import { NotificationBell } from '../../features/notifications/NotificationBell';
import { UserMenu } from '../../features/auth/UserMenu';

// Admin receives no personal notifications (Pass 4B §4.6), so AdminLayout hides the bell.
export function AppHeader({ title, showNotifications = true }) {
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="rounded p-2 text-slate-600 hover:bg-slate-100"
        >
          <Menu className="size-5" />
        </button>
        <span className="font-semibold text-slate-900">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        {showNotifications && <NotificationBell />}
        <UserMenu />
      </div>
    </header>
  );
}
