import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { homeFor, QUERY_KEYS } from '../../config/constants';
import { useAuthStore } from '../../stores/useAuthStore';
import { authApi } from './authApi';

export function useAuth() {
  const { accessToken, setTokens, clearTokens } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // The token survives a page refresh but the profile does not, so fetch it back.
  // This query is also what tells us the token is still good.
  const {
    data: user,
    isLoading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEYS.ME,
    queryFn: authApi.me,
    enabled: Boolean(accessToken),
    retry: false,
    staleTime: Infinity,
  });

  // Raised by the axios interceptor when refreshing finally fails.
  useEffect(() => {
    const onLost = () => {
      clearTokens();
      queryClient.clear();
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:session-lost', onLost);
    return () => window.removeEventListener('auth:session-lost', onLost);
  }, [clearTokens, queryClient, navigate]);

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setTokens({ access: data.access, refresh: data.refresh });
      // Seed the cache so no extra /me/ round-trip happens right after login.
      queryClient.setQueryData(QUERY_KEYS.ME, data.user);
      navigate(data.user?.must_change_password ? '/change-password' : homeFor(data.user), { replace: true });
    },
    onError: (error) => toast.error(error.apiMessage || 'Invalid email or password.'),
  });

  const logout = useMutation({
    mutationFn: authApi.logout,
    // Clear locally even when the call fails; the token is useless to us either way.
    onSettled: () => {
      clearTokens();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  return {
    user: user ?? null,
    isAuthenticated: Boolean(accessToken) && !isError,
    // Guards must not redirect while the profile is still in flight.
    isReady: !accessToken || !isLoading,
    login: login.mutate,
    isLoggingIn: login.isPending,
    logout: logout.mutate,
  };
}
