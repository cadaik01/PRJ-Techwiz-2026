import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { BarChart3, Boxes, CalendarClock, Home, LayoutDashboard, Menu, MessageSquare, Package, Settings, Store, UserRound, Warehouse } from 'lucide-react';
import { FarmerStatusGate } from '@/features/farmer/components/FarmerStatusGate';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/Sheet';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUiStore } from '@/stores/ui.store';
import { cn } from '@/lib/cn';
import './FarmerLayout.css';
const navItems = [
    { to: '/farmer', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/farmer/orders', label: 'Orders', icon: Package, end: false },
    { to: '/farmer/products', label: 'Products', icon: Boxes, end: false },
    { to: '/farmer/stock-template', label: 'Stock template', icon: CalendarClock, end: false },
    { to: '/farmer/markets', label: 'Markets & slots', icon: Store, end: false },
    { to: '/farmer/reviews', label: 'Reviews', icon: MessageSquare, end: false },
    { to: '/farmer/stats', label: 'Stats', icon: BarChart3, end: false },
    { to: '/farmer/profile', label: 'Stall profile', icon: UserRound, end: false },
    { to: '/farmer/settings', label: 'Change password', icon: Settings, end: false },
];
function SideNav({ collapsed }) {
    return (<nav className="farmer-layout__nav">
      {navItems.map((item) => (<NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cn('farmer-layout__nav-link', isActive && 'is-active', collapsed && 'farmer-layout__nav-link--collapsed')} title={item.label}>
          <item.icon className="farmer-layout__nav-icon"/>
          {!collapsed ? <span>{item.label}</span> : null}
        </NavLink>))}
    </nav>);
}
export function FarmerLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const collapsed = useUiStore((s) => s.sidebarCollapsed);
    const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);
    const [searchQuery, setSearchQuery] = useState('');
    const onSearch = (event) => {
        event.preventDefault();
        const term = searchQuery.trim();
        if (!term)
            return;
        navigate(`/farmer/products?q=${encodeURIComponent(term)}`);
    };
    return (<div className="farmer-layout">
      <a href="#main-content" className="farmer-layout__skip-link">
        Skip to main content
      </a>
      <aside className={cn('farmer-layout__sidebar', collapsed
            ? 'farmer-layout__sidebar--collapsed'
            : 'farmer-layout__sidebar--expanded')}>
        <div className="farmer-layout__sidebar-head">
          {!collapsed ? (<Link to="/farmer" className="farmer-layout__sidebar-brand">
              <Warehouse className="farmer-layout__sidebar-brand-icon"/>
              Stall workspace
            </Link>) : null}
          <Button variant="ghost" size="icon" aria-label="Collapse sidebar" onClick={() => setCollapsed(!collapsed)}>
            <Menu className="farmer-layout__nav-icon"/>
          </Button>
        </div>
        <SideNav collapsed={collapsed}/>
      </aside>

      <div className="farmer-layout__body">
        <header className="glass farmer-layout__header">
          <div className="farmer-layout__header-mobile">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                  <Menu className="farmer-layout__nav-icon"/>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="farmer-layout__sheet">
                <SheetHeader className="farmer-layout__sheet-header">
                  <SheetTitle>Stall menu</SheetTitle>
                </SheetHeader>
                <SideNav collapsed={false}/>
              </SheetContent>
            </Sheet>
            <span className="farmer-layout__header-title">Stall workspace</span>
          </div>
          <form className="farmer-layout__search" role="search" onSubmit={onSearch}>
            <Input
              type="search"
              label="Search produce"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="farmer-layout__search-input"
            />
          </form>
          <div className="farmer-layout__header-actions">
            <NotificationBell role="FARMER" listPath="/farmer/notifications"/>
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon" aria-label="Home">
              <Link to="/">
                <Home className="farmer-layout__nav-icon"/>
              </Link>
            </Button>
            <UserMenu />
          </div>
        </header>

        <main id="main-content" className="farmer-layout__main" tabIndex={-1}>
          <FarmerStatusGate status={user?.farmer_status} rejectionReason={null}>
            <Outlet />
          </FarmerStatusGate>
        </main>
      </div>
    </div>);
}
