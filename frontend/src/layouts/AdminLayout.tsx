import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  ClipboardList,
  FolderTree,
  LayoutDashboard,
  Menu,
  ShieldAlert,
  Store,
  Users,
  Warehouse,
  FileBarChart,
  Megaphone,
  ScrollText,
  Settings,
} from 'lucide-react';

import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/Button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/Sheet';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/cn';

import './AdminLayout.css';

const navItems = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/admin/farmers', label: 'Nông dân', icon: Warehouse, end: false },
  { to: '/admin/customers', label: 'Khách hàng', icon: Users, end: false },
  { to: '/admin/markets', label: 'Chợ', icon: Store, end: false },
  { to: '/admin/categories', label: 'Danh mục', icon: FolderTree, end: false },
  { to: '/admin/moderation', label: 'Kiểm duyệt', icon: ShieldAlert, end: false },
  { to: '/admin/reports', label: 'Báo cáo', icon: FileBarChart, end: false },
  { to: '/admin/announcements', label: 'Thông báo', icon: Megaphone, end: false },
  { to: '/admin/audit-logs', label: 'Audit log', icon: ScrollText, end: false },
  { to: '/admin/settings', label: 'Cài đặt', icon: Settings, end: false },
];

function SideNav({ collapsed }: { collapsed: boolean }) {
  return (
    <nav className="admin-layout__nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'admin-layout__nav-link',
              isActive && 'is-active',
              collapsed && 'admin-layout__nav-link--collapsed',
            )
          }
          title={item.label}
        >
          <item.icon className="admin-layout__nav-icon" />
          {!collapsed ? <span>{item.label}</span> : null}
        </NavLink>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);

  return (
    <div className="admin-layout">
      <a href="#main-content" className="admin-layout__skip-link">
        Bỏ qua đến nội dung chính
      </a>
      <aside
        className={cn(
          'admin-layout__sidebar',
          collapsed
            ? 'admin-layout__sidebar--collapsed'
            : 'admin-layout__sidebar--expanded',
        )}
      >
        <div className="admin-layout__sidebar-head">
          {!collapsed ? (
            <Link to="/admin" className="admin-layout__sidebar-brand">
              <ClipboardList className="admin-layout__sidebar-brand-icon" />
              Admin
            </Link>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Thu gọn sidebar"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu className="admin-layout__nav-icon" />
          </Button>
        </div>
        <SideNav collapsed={collapsed} />
      </aside>

      <div className="admin-layout__body">
        <header className="glass admin-layout__header">
          <div className="admin-layout__header-mobile">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mở menu">
                  <Menu className="admin-layout__nav-icon" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="admin-layout__sheet">
                <SheetHeader className="admin-layout__sheet-header">
                  <SheetTitle>Menu quản trị</SheetTitle>
                </SheetHeader>
                <SideNav collapsed={false} />
              </SheetContent>
            </Sheet>
            <span className="admin-layout__header-title">Quản trị</span>
          </div>
          <div className="admin-layout__header-actions">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main id="main-content" className="admin-layout__main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
