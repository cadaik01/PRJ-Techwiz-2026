import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { AuthLayout } from '../layouts/AuthLayout';
import { ChangePasswordPage } from '../pages/public/ChangePasswordPage';
import { ForbiddenPage } from '../pages/public/ForbiddenPage';
import { HomePage } from '../pages/public/HomePage';
import { LoginPage } from '../pages/public/LoginPage';
import { NotFoundPage } from '../pages/public/NotFoundPage';
import { SitemapPage } from '../pages/public/SitemapPage';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';

// Add one branch per role once the SRS names them, for example:
//   { element: <RoleRoute allow={[ROLES.ADMIN]} />, children: [
//       { path: 'admin', element: <AdminLayout />, children: [...] } ] }
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
    ],
  },
  { path: '/sitemap', element: <SitemapPage /> },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
