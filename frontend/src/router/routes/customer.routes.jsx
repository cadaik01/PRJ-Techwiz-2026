import { lazy } from 'react';

import { Suspend } from '../Suspend';
import { RequireAuth, RequireRole } from '../guards';
import { CustomerLayout } from '../../layouts/CustomerLayout';

const CustomerDashboardPage = lazy(
  () => import('@/pages/customer/CustomerDashboardPage'),
);
const CartPage = lazy(() => import('@/pages/customer/CartPage'));
const CheckoutPage = lazy(() => import('@/pages/customer/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('@/pages/customer/OrderSuccessPage'));
const OrdersPage = lazy(() => import('@/pages/customer/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/pages/customer/OrderDetailPage'));
const OrderEditPage = lazy(() => import('@/pages/customer/OrderEditPage'));
const OrderReviewPage = lazy(() => import('@/pages/customer/OrderReviewPage'));
const FavoritesPage = lazy(() => import('@/pages/customer/FavoritesPage'));
const ProfilePage = lazy(() => import('@/pages/customer/ProfilePage'));
const NotificationsPage = lazy(() => import('@/pages/customer/NotificationsPage'));
const ChangePasswordPage = lazy(() => import('@/pages/auth/ChangePasswordPage'));

/** Nested under PublicLayout (see public.routes). */
export const customerRoutes = [
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole allow={['CUSTOMER']} />,
        children: [
          {
            element: <CustomerLayout />,
            children: [
              {
                path: '/app',
                element: (
                  <Suspend>
                    <CustomerDashboardPage />
                  </Suspend>
                ),
              },
              {
                path: '/app/cart',
                element: (
                  <Suspend>
                    <CartPage />
                  </Suspend>
                ),
              },
              {
                path: '/app/checkout',
                element: (
                  <Suspend>
                    <CheckoutPage />
                  </Suspend>
                ),
              },
              {
                path: '/app/orders/success',
                element: (
                  <Suspend>
                    <OrderSuccessPage />
                  </Suspend>
                ),
              },
              {
                path: '/app/orders',
                element: (
                  <Suspend>
                    <OrdersPage />
                  </Suspend>
                ),
              },
              {
                path: '/app/orders/:id',
                element: (
                  <Suspend>
                    <OrderDetailPage />
                  </Suspend>
                ),
              },
              {
                path: '/app/orders/:id/edit',
                element: (
                  <Suspend>
                    <OrderEditPage />
                  </Suspend>
                ),
              },
              {
                path: '/app/orders/:id/review',
                element: (
                  <Suspend>
                    <OrderReviewPage />
                  </Suspend>
                ),
              },
              {
                path: '/app/favorites',
                element: (
                  <Suspend>
                    <FavoritesPage />
                  </Suspend>
                ),
              },
              {
                path: '/app/profile',
                element: (
                  <Suspend>
                    <ProfilePage />
                  </Suspend>
                ),
              },
              {
                path: '/app/notifications',
                element: (
                  <Suspend>
                    <NotificationsPage />
                  </Suspend>
                ),
              },
              {
                path: '/app/change-password',
                element: (
                  <Suspend>
                    <ChangePasswordPage />
                  </Suspend>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
];
