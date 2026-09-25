import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { authApi } from '@/features/auth/api/authApi';
import { ApiError } from '@/lib/ApiError';
import { DASHBOARD_PATH, QUERY_KEYS } from '@/config/constants';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/types';

function homePathForRole(role: Role): string {
  if (role === 'ADMIN') return DASHBOARD_PATH.ADMIN;
  if (role === 'FARMER') return DASHBOARD_PATH.FARMER;
  return DASHBOARD_PATH.CUSTOMER;
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
      const access = useAuthStore.getState().accessToken;
      try {
        if (access) await authApi.logout(access);
      } catch {
        // Clear local session even if API fails.
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
      toast.success('Password updated — please sign in again.');
      clearSession();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      const apiError = ApiError.fromUnknown(error);
      if (Object.keys(apiError.fieldErrors).length === 0) {
        toast.error(apiError.friendlyMessage);
      }
    },
  });

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

  const registerFarmerMutation = useMutation({
    mutationFn: authApi.registerFarmer,
    onSuccess: (data) => {
      setTokens({
        access: data.access,
        refresh: data.refresh,
        role: data.user.role,
      });
      queryClient.setQueryData(QUERY_KEYS.ME, data.user);
      toast.success('Stall submitted — we will review it shortly.');
      navigate(homePathForRole(data.user.role), { replace: true });
    },
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
    setRole,
  };
}
