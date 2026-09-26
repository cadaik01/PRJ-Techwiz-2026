import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { DASHBOARD_PATH } from '@/config/constants';
import { useAuth } from '@/hooks/authentication/useAuth';
function homePathForRole(role) {
    // Pass 3 route table: each role has its own dashboard (C-00, F-01, A-01).
    return DASHBOARD_PATH[role] ?? '/';
}
export function GuestOnly() {
    const { isAuthenticated, user, isLoadingMe } = useAuth();
    const location = useLocation();
    if (isAuthenticated && isLoadingMe) {
        return <PageSkeleton />;
    }
    if (isAuthenticated && user) {
        return (<Navigate to={homePathForRole(user.role)} replace state={{ from: location }}/>);
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
        return <Navigate to="/login" replace state={{ from: location }}/>;
    }
    if (isLoadingMe || !user) {
        return <PageSkeleton />;
    }
    return <Outlet />;
}
export function RequireRole({ allow }) {
    const { user, isLoadingMe } = useAuth();
    if (isLoadingMe || !user) {
        return <PageSkeleton />;
    }
    if (!allow.includes(user.role)) {
        return <Navigate to="/403" replace/>;
    }
    return <Outlet />;
}
