import { Outlet } from 'react-router-dom';

import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';

// Shared shell for every signed-in section. Role layouts (AdminLayout, ...) wrap it
// and pass that role's own sidebar entries.
export function AppLayout({ title = 'PRJ-Techwiz 2026', navItems = [], showNotifications = true }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar items={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader title={title} showNotifications={showNotifications} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
