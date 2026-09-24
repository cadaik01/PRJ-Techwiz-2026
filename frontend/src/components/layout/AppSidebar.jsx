import { NavLink } from 'react-router-dom';

import { cn } from '../../lib/utils';
import { isDesktop, useUIStore } from '../../stores/useUIStore';

// `items` is [{ to, label, icon }]. Each layout passes the entries its own
// audience should see, so the sidebar itself stays domain-agnostic.
//
// From 768px up it sits beside the page; below that it is a drawer over the page,
// otherwise its fixed width squeezes the content into a horizontal scroll.
export function AppSidebar({ items = [] }) {
  const open = useUIStore((state) => state.sidebarOpen);
  const setSidebar = useUIStore((state) => state.setSidebar);

  const closeOnMobile = () => {
    if (!isDesktop()) setSidebar(false);
  };

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setSidebar(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 shrink-0 border-r border-slate-200 bg-white transition-all',
          'md:static md:z-auto',
          // invisible, not just zero-width, so the hidden links drop out of the tab order.
          open ? 'w-60' : 'invisible w-0 overflow-hidden border-r-0',
        )}
      >
        <nav className="flex flex-col gap-1 p-3">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeOnMobile}
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
    </>
  );
}
