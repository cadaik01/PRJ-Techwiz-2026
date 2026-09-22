import { Navigate, Outlet } from 'react-router-dom';

import { PageSkeleton } from '../components/feedback/PageSkeleton';
import { useAuth } from '../features/auth/useAuth';

// Route guard for role-gated sections: <RoleRoute allow={[ROLES.ADMIN]} />.
//
// This is a usability guard, not the security boundary. The server re-checks every
// request; hiding a route in the browser only keeps the UI tidy.
export function RoleRoute({ allow = [] }) {
  const { user, isReady } = useAuth();

  if (!isReady) return <PageSkeleton />;
  if (!allow.length) return <Outlet />;

  return allow.includes(user?.role) ? <Outlet /> : <Navigate to="/403" replace />;
}
