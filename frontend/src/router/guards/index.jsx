import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { DASHBOARD_PATH } from '@/config/constants';
import { useAuth } from '@/hooks/authentication/useAuth';

function homePathForRole(role      )         {
  if (role === 'ADMIN') return DASHBOARD_PATH.ADMIN;
  if (role === 'FARMER') return DASHBOARD_PATH.FARMER;
  return DASHBOARD_PATH.CUSTOMER;
}

export function GuestOnly() {
  const { isAuthenticated, user, isLoadingMe } = useAuth();
  const location = useLocation();

  if (isAuthenticated && isLoadingMe) {
    return <PageSkeleton />;
  }

  if (isAuthenticated && user) {
    return (
      <Navigate to={homePathForRole(user.role)} replace state={{ from: location }} />
    );
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
    // D-027 keeps the portals apart, so an admin page sends the visitor to the admin portal.
    const portal = location.pathname.startsWith(`${DASHBOARD_PATH.ADMIN}/`)
      ? '/admin/login'
      : '/login';
    return <Navigate to={portal} replace state={{ from: location }} />;
  }

  if (isLoadingMe || !user) {
    return <PageSkeleton />;
  }

  return <Outlet />;
}

export function RequireRole({ allow }                   ) {
  const { user, isLoadingMe } = useAuth();

  if (isLoadingMe || !user) {
    return <PageSkeleton />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
