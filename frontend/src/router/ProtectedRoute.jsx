import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { PageSkeleton } from '../components/feedback/PageSkeleton';
import { useAuth } from '../features/auth/useAuth';

// Blocks anonymous visitors. The admin area has its own sign-in page (D-027).
export function ProtectedRoute() {
  const { isAuthenticated, isReady } = useAuth();
  const location = useLocation();

  // Wait for the profile fetch before deciding, otherwise a page refresh bounces
  // an authenticated user to /login for a frame.
  if (!isReady) return <PageSkeleton />;

  if (!isAuthenticated) {
    const loginPath = location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
