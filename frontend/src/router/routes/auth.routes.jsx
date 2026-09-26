import { lazy } from 'react';

import { Suspend } from '../Suspend';
import { GuestOnly } from '../guards';
import { AuthLayout } from '../../layouts/AuthLayout';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage'));
const AdminLoginPage = lazy(() => import('@/pages/auth/AdminLoginPage'));
const RegisterCustomerPage = lazy(() => import('@/pages/auth/RegisterCustomerPage'));
const RegisterFarmerPage = lazy(() => import('@/pages/auth/RegisterFarmerPage'));

export const authRoutes = [
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
            // A-00 (D-027): the admin portal has its own page, separate from /login.
            path: '/admin/login',
            element: (
              <Suspend>
                <AdminLoginPage />
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
