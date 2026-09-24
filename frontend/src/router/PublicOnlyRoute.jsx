import { Navigate, Outlet } from 'react-router-dom';

import { PageSkeleton } from '../components/feedback/PageSkeleton';
import { useAuth } from '../features/auth/useAuth';

// Keeps a signed-in user off /login and /forgot-password.
export function PublicOnlyRoute() {
  const { isAuthenticated, isReady } = useAuth();

  if (!isReady) return <PageSkeleton />;
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
