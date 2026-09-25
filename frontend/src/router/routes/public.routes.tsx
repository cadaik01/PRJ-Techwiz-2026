import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

import { Suspend } from '@/router/Suspend';
import { PublicLayout } from '@/layouts/PublicLayout';
import { customerRoutes } from '@/router/routes/customer.routes';

const HomePage = lazy(() => import('@/pages/public/HomePage'));
const MarketsPage = lazy(() => import('@/pages/public/MarketsPage'));
const MarketDetailPage = lazy(() => import('@/pages/public/MarketDetailPage'));
const ProductsPage = lazy(() => import('@/pages/public/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/public/ProductDetailPage'));
const FarmersPage = lazy(() => import('@/pages/public/FarmersPage'));
const FarmerDetailPage = lazy(() => import('@/pages/public/FarmerDetailPage'));

export const publicRoutes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: (
          <Suspend>
            <HomePage />
          </Suspend>
        ),
      },
      {
        path: '/markets',
        element: (
          <Suspend>
            <MarketsPage />
          </Suspend>
        ),
      },
      {
        path: '/markets/:id',
        element: (
          <Suspend>
            <MarketDetailPage />
          </Suspend>
        ),
      },
      {
        path: '/products',
        element: (
          <Suspend>
            <ProductsPage />
          </Suspend>
        ),
      },
      {
        path: '/products/:id',
        element: (
          <Suspend>
            <ProductDetailPage />
          </Suspend>
        ),
      },
      {
        path: '/farmers',
        element: (
          <Suspend>
            <FarmersPage />
          </Suspend>
        ),
      },
      {
        path: '/farmers/:id',
        element: (
          <Suspend>
            <FarmerDetailPage />
          </Suspend>
        ),
      },
      ...customerRoutes,
    ],
  },
];
