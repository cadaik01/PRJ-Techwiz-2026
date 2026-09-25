import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { PageSkeleton } from '@/components/feedback/PageSkeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Role } from '@/types';

export function GuestOnly() {
  const { isAuthenticated, user, isLoadingMe } = useAuth();
  const location = useLocation();

  if (isAuthenticated && isLoadingMe) {
    return <PageSkeleton />;
  }

  if (isAuthenticated && user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (isAuthenticated && !user) {
    return <PageSkeleton />;
  }

  return <Outlet />;
}

export function RequireAuth() {
  const { isAuthenticated, isLoadingMe, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (isLoadingMe || !user) {
    return <PageSkeleton />;
  }

  return <Outlet />;
}

export function RequireRole({ allow }: { allow: Role[] }) {
  const { user, isLoadingMe } = useAuth();

  if (isLoadingMe || !user) {
    return <PageSkeleton />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
