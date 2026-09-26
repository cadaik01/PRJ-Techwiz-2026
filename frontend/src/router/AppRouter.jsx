import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { Suspend } from '@/router/Suspend';
import { RequireAuth } from '@/router/guards';
import { publicRoutes } from '@/router/routes/public.routes';
import { authRoutes } from '@/router/routes/auth.routes';
import { farmerRoutes } from '@/router/routes/farmer.routes';
import { adminRoutes } from '@/router/routes/admin.routes';

const ChangePasswordPage = lazy(() => import('@/pages/auth/ChangePasswordPage'));
const ForbiddenPage = lazy(() => import('@/pages/errors/ForbiddenPage'));
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'));

export const router = createBrowserRouter([
  ...publicRoutes,
  ...authRoutes,
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/change-password',
        element: (
          <Suspend>
            <ChangePasswordPage />
          </Suspend>
        ),
      },
      ...farmerRoutes,
      ...adminRoutes,
    ],
  },
  {
    path: '/403',
    element: (
      <Suspend>
        <ForbiddenPage />
      </Suspend>
    ),
  },
  {
    path: '*',
    element: (
      <Suspend>
        <NotFoundPage />
      </Suspend>
    ),
  },
  { path: '/dashboard', element: <Navigate to="/app" replace /> },
]);
