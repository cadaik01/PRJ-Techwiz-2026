import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

import { ROLES } from '../config/constants';
import { AdminLayout } from '../layouts/AdminLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { CategoriesPage } from '../pages/admin/CategoriesPage';
import { ChangePasswordPage } from '../pages/public/ChangePasswordPage';
import { ForbiddenPage } from '../pages/public/ForbiddenPage';
import { HomePage } from '../pages/public/HomePage';
import { LoginPage } from '../pages/public/LoginPage';
import { NotFoundPage } from '../pages/public/NotFoundPage';
import { SitemapPage } from '../pages/public/SitemapPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { RoleRoute } from './RoleRoute';

// One branch per role (Pass 3 §2.1): ProtectedRoute sends guests to /login, then
// RoleRoute sends a signed-in user of another role to /403.
const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: '/login', element: <LoginPage /> }],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/change-password', element: <ChangePasswordPage /> },
      {
        element: <RoleRoute allow={[ROLES.ADMIN]} />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              // Until A-01 (dashboard) lands, the admin home opens the first finished page.
              { index: true, element: <Navigate to="categories" replace /> },
              { path: 'categories', element: <CategoriesPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '/sitemap', element: <SitemapPage /> },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
