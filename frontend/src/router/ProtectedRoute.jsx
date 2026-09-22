import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { PageSkeleton } from '../components/feedback/PageSkeleton';
import { useAuth } from '../features/auth/useAuth';

// Blocks anonymous visitors and forces a first-login password change.
export function ProtectedRoute() {
  const { isAuthenticated, isReady, user } = useAuth();
  const location = useLocation();

  // Wait for the profile fetch before deciding, otherwise a page refresh bounces
  // an authenticated user to /login for a frame.
  if (!isReady) return <PageSkeleton />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}
