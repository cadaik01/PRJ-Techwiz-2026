import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { Suspend } from './Suspend';
import { RequireAuth } from './guards';
import { publicRoutes } from './routes/public.routes';
import { authRoutes } from './routes/auth.routes';
import { farmerRoutes } from './routes/farmer.routes';
import { adminRoutes } from './routes/admin.routes';

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
