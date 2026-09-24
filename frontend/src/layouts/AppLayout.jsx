import { Outlet } from 'react-router-dom';

import { AppHeader } from '../components/layout/AppHeader';
import { AppSidebar } from '../components/layout/AppSidebar';

// Shared shell for every signed-in section. Copy this into a role-specific layout
// (AdminLayout, StaffLayout, ...) once the SRS defines the actors, passing that
// role's own `items` to the sidebar.
export function AppLayout({ title = 'PRJ-Techwiz 2026', navItems = [] }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar items={navItems} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader title={title} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
