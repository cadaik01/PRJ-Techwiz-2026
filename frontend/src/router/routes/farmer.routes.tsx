import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { Suspend } from '@/router/Suspend';
import { RequireRole } from '@/router/guards';
import { FarmerLayout } from '@/layouts/FarmerLayout';

const FarmerDashboardPage = lazy(() => import('@/pages/farmer/FarmerDashboardPage'));
const FarmerOrdersPage = lazy(() => import('@/pages/farmer/FarmerOrdersPage'));
const FarmerOrderDetailPage = lazy(() => import('@/pages/farmer/FarmerOrderDetailPage'));
const FarmerProductsPage = lazy(() => import('@/pages/farmer/FarmerProductsPage'));
const FarmerProductFormPage = lazy(() => import('@/pages/farmer/FarmerProductFormPage'));
const FarmerStockTemplatePage = lazy(
  () => import('@/pages/farmer/FarmerStockTemplatePage'),
);
const FarmerMarketsPage = lazy(() => import('@/pages/farmer/FarmerMarketsPage'));
const FarmerProfilePage = lazy(() => import('@/pages/farmer/FarmerProfilePage'));
const FarmerReviewsPage = lazy(() => import('@/pages/farmer/FarmerReviewsPage'));
const FarmerNotificationsPage = lazy(
  () => import('@/pages/farmer/FarmerNotificationsPage'),
);
const FarmerStatsPage = lazy(() => import('@/pages/farmer/FarmerStatsPage'));
const ChangePasswordPage = lazy(() => import('@/pages/shared/ChangePasswordPage'));

/** Nested under a shared RequireAuth parent in AppRouter. */
export const farmerRoutes: RouteObject[] = [
  {
    element: <RequireRole allow={['FARMER']} />,
    children: [
      {
        element: <FarmerLayout />,
        children: [
          {
            path: '/farmer',
            element: (
              <Suspend>
                <FarmerDashboardPage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/orders',
            element: (
              <Suspend>
                <FarmerOrdersPage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/orders/:id',
            element: (
              <Suspend>
                <FarmerOrderDetailPage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/products',
            element: (
              <Suspend>
                <FarmerProductsPage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/products/new',
            element: (
              <Suspend>
                <FarmerProductFormPage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/products/:id/edit',
            element: (
              <Suspend>
                <FarmerProductFormPage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/stock-template',
            element: (
              <Suspend>
                <FarmerStockTemplatePage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/markets',
            element: (
              <Suspend>
                <FarmerMarketsPage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/reviews',
            element: (
              <Suspend>
                <FarmerReviewsPage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/stats',
            element: (
              <Suspend>
                <FarmerStatsPage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/profile',
            element: (
              <Suspend>
                <FarmerProfilePage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/notifications',
            element: (
              <Suspend>
                <FarmerNotificationsPage />
              </Suspend>
            ),
          },
          {
            path: '/farmer/settings',
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
];
