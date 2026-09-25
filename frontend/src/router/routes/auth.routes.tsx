import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { Suspend } from '@/router/Suspend';
import { GuestOnly } from '@/router/guards';
import { AuthLayout } from '@/layouts/AuthLayout';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const RegisterCustomerPage = lazy(() => import('@/pages/auth/RegisterCustomerPage'));
const RegisterFarmerPage = lazy(() => import('@/pages/auth/RegisterFarmerPage'));

export const authRoutes: RouteObject[] = [
  {
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: (
              <Suspend>
                <LoginPage />
              </Suspend>
            ),
          },
          {
            path: '/register',
            element: (
              <Suspend>
                <RegisterCustomerPage />
              </Suspend>
            ),
          },
          {
            path: '/register/farmer',
            element: (
              <Suspend>
                <RegisterFarmerPage />
              </Suspend>
            ),
          },
        ],
      },
    ],
  },
];
