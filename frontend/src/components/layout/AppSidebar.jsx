import { NavLink } from 'react-router-dom';

import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/useUIStore';

// `items` is [{ to, label, icon }]. Each layout passes the entries its own
// audience should see, so the sidebar itself stays domain-agnostic.
export function AppSidebar({ items = [] }) {
  const open = useUIStore((state) => state.sidebarOpen);

  return (
    <aside
      className={cn(
        'shrink-0 border-r border-slate-200 bg-white transition-all',
        open ? 'w-60' : 'w-0 overflow-hidden',
      )}
    >
      <nav className="flex flex-col gap-1 p-3">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-100',
              )
            }
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
