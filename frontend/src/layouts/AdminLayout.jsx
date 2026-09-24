import { Tags } from 'lucide-react';

import { AppLayout } from './AppLayout';

// Sidebar of the admin area (Pass 3 §1.1). Each entry is added together with its page.
const NAV_ITEMS = [{ to: '/admin/categories', label: 'Danh mục', icon: Tags }];

export function AdminLayout() {
  return <AppLayout title="MarketLink · Quản trị" navItems={NAV_ITEMS} showNotifications={false} />;
}
