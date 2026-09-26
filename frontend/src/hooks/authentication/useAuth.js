import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '@/services/common/authApi';
import { ApiError } from '@/lib/ApiError';
import { DASHBOARD_PATH, QUERY_KEYS } from '@/config/constants';
import { useAuthStore } from '@/stores/auth.store';
function homePathForRole(role) {
    // Pass 3 route table: every role has its own dashboard (C-00, F-01, A-01).
    return DASHBOARD_PATH[role] ?? '/';
}
export function useAuth() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const accessToken = useAuthStore((s) => s.accessToken);
    const setTokens = useAuthStore((s) => s.setTokens);
    const setRole = useAuthStore((s) => s.setRole);
    const clearSession = useAuthStore((s) => s.clearSession);
    const meQuery = useQuery({
        queryKey: QUERY_KEYS.ME,
        queryFn: authApi.me,
        enabled: Boolean(accessToken),
        retry: false,
    });
    const loginMutation = useMutation({
        mutationFn: authApi.login,
        onSuccess: (data) => {
            setTokens({
                access: data.access,
                refresh: data.refresh,
                role: data.user.role,
            });
            queryClient.setQueryData(QUERY_KEYS.ME, data.user);
            toast.success('Welcome back — you are signed in');
            navigate(homePathForRole(data.user.role), { replace: true });
        },
        onError: (error) => {
            const apiError = ApiError.fromUnknown(error);
            if (Object.keys(apiError.fieldErrors).length === 0) {
                toast.error(apiError.friendlyMessage);
            }
        },
    });
    const adminLoginMutation = useMutation({
        mutationFn: authApi.adminLogin,
        onSuccess: (data) => {
            setTokens({
                access: data.access,
                refresh: data.refresh,
                role: data.user.role,
            });
            queryClient.setQueryData(QUERY_KEYS.ME, data.user);
            toast.success('Welcome back — you are signed in');
            navigate(homePathForRole(data.user.role), { replace: true });
        },
        onError: (error) => {
            const apiError = ApiError.fromUnknown(error);
            if (Object.keys(apiError.fieldErrors).length === 0) {
                toast.error(apiError.friendlyMessage);
            }
        },
    });
    const logoutMutation = useMutation({
        mutationFn: async () => {
            // AU-05 revokes the session by its refresh token (D-021).
            const refresh = useAuthStore.getState().refreshToken;
            try {
                if (refresh)
                    await authApi.logout({ refresh });
            }
            catch {
                // Clear the local session even if the call fails.
            }
        },
        onSettled: () => {
            clearSession();
            queryClient.clear();
            navigate('/login', { replace: true });
        },
    });
    const changePasswordMutation = useMutation({
        mutationFn: authApi.changePassword,
        onSuccess: () => {
            // D-021 / AU-07: this device keeps its session; only the other devices are signed out.
            toast.success('Password updated. Your other devices have been signed out.');
        },
        onError: (error) => {
            const apiError = ApiError.fromUnknown(error);
            if (Object.keys(apiError.fieldErrors).length === 0) {
                toast.error(apiError.friendlyMessage);
            }
        },
    });
    /** Open a session from an auth payload that was held back (G-11). */
    function startSession({ access, refresh, user }) {
        setTokens({ access, refresh, role: user.role });
        queryClient.setQueryData(QUERY_KEYS.ME, user);
    }
    const registerCustomerMutation = useMutation({
        mutationFn: authApi.registerCustomer,
        onSuccess: (data) => {
            setTokens({
                access: data.access,
                refresh: data.refresh,
                role: data.user.role,
            });
            queryClient.setQueryData(QUERY_KEYS.ME, data.user);
            toast.success('Account created — welcome to MarketLink');
            navigate(homePathForRole(data.user.role), { replace: true });
        },
        onError: (error) => {
            const apiError = ApiError.fromUnknown(error);
            if (Object.keys(apiError.fieldErrors).length === 0) {
                toast.error(apiError.friendlyMessage);
            }
        },
    });
    // AU-02 hands back tokens, but G-11 shows the approval notice first: the caller decides when the
    // session starts, otherwise GuestOnlyRoute would redirect off the notice the moment it renders.
    const registerFarmerMutation = useMutation({
        mutationFn: authApi.registerFarmer,
        onError: (error) => {
            const apiError = ApiError.fromUnknown(error);
            if (Object.keys(apiError.fieldErrors).length === 0) {
                toast.error(apiError.friendlyMessage);
            }
        },
    });
    return {
        user: meQuery.data,
        isLoadingMe: meQuery.isLoading,
        isAuthenticated: Boolean(accessToken),
        login: loginMutation.mutateAsync,
        loginPending: loginMutation.isPending,
        adminLogin: adminLoginMutation.mutateAsync,
        adminLoginPending: adminLoginMutation.isPending,
        logout: () => logoutMutation.mutate(),
        changePassword: changePasswordMutation.mutateAsync,
        changePasswordPending: changePasswordMutation.isPending,
        registerCustomer: registerCustomerMutation.mutateAsync,
        registerCustomerPending: registerCustomerMutation.isPending,
        registerFarmer: registerFarmerMutation.mutateAsync,
        registerFarmerPending: registerFarmerMutation.isPending,
        startSession,
        setRole,
    };
}
