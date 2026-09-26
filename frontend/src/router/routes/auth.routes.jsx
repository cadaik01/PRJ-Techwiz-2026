import { lazy } from 'react';
import { Suspend } from '@/router/Suspend';
import { GuestOnly } from '@/router/guards';
import { AuthLayout } from '@/layouts/AuthLayout';
const LoginPage = lazy(() => import('@/pages/guest/LoginPage'));
const RegisterCustomerPage = lazy(() => import('@/pages/guest/RegisterCustomerPage'));
const RegisterFarmerPage = lazy(() => import('@/pages/guest/RegisterFarmerPage'));
export const authRoutes = [
    {
        element: <GuestOnly />,
        children: [
            {
                element: <AuthLayout />,
                children: [
                    {
                        path: '/login',
                        element: (<Suspend>
                <LoginPage />
              </Suspend>),
                    },
                    {
                        path: '/register',
                        element: (<Suspend>
                <RegisterCustomerPage />
              </Suspend>),
                    },
                    {
                        path: '/register/farmer',
                        element: (<Suspend>
                <RegisterFarmerPage />
              </Suspend>),
                    },
                ],
            },
        ],
    },
];
