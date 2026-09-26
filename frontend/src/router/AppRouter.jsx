import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspend } from '@/router/Suspend';
import { RequireAuth } from '@/router/guards';
import { publicRoutes } from '@/router/routes/public.routes';
import { authRoutes } from '@/router/routes/auth.routes';
import { adminAuthRoutes } from '@/router/routes/adminAuth.routes';
import { farmerRoutes } from '@/router/routes/farmer.routes';
import { adminRoutes } from '@/router/routes/admin.routes';
const ForbiddenPage = lazy(() => import('@/pages/guest/ForbiddenPage'));
const NotFoundPage = lazy(() => import('@/pages/guest/NotFoundPage'));
export const router = createBrowserRouter([
    ...publicRoutes,
    ...authRoutes,
    ...adminAuthRoutes,
    {
        element: <RequireAuth />,
        children: [...farmerRoutes, ...adminRoutes],
    },
    {
        path: '/403',
        element: (<Suspend>
        <ForbiddenPage />
      </Suspend>),
    },
    {
        path: '*',
        element: (<Suspend>
        <NotFoundPage />
      </Suspend>),
    },
    // A bare /dashboard is not in the route table; send it to the customer overview (C-00).
    { path: '/dashboard', element: <Navigate to="/customer" replace/> },
]);
