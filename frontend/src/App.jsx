import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/common/feedback/ErrorBoundary';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { TooltipProvider } from '@/components/common/ui/Tooltip';
import { QUERY_KEYS, STORAGE_KEYS } from '@/config/constants';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/router/AppRouter';
import { authApi } from '@/services/common/authApi';
import { useAuthStore } from '@/stores/auth.store';

function waitForAuthHydration() {
  if (useAuthStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/**
 * Restores the session before the first route renders, so a guard never sees a half-loaded state
 * and bounces a signed-in user to /login.
 */
function BootProvider({ children }) {
  const [ready, setReady] = useState(false);
  const setTokens = useAuthStore((state) => state.setTokens);
  const setRole = useAuthStore((state) => state.setRole);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    // The axios client fires this when a refresh token is dead (TOKEN_INVALID, D-021).
    const onSessionLost = () => {
      clearSession();
      queryClient.clear();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    };
    window.addEventListener('auth:session-lost', onSessionLost);
    return () => window.removeEventListener('auth:session-lost', onSessionLost);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      await waitForAuthHydration();
      const state = useAuthStore.getState();
      let access = state.accessToken;
      let refresh = state.refreshToken;
      try {
        access = access || localStorage.getItem(STORAGE_KEYS.ACCESS);
        refresh = refresh || localStorage.getItem(STORAGE_KEYS.REFRESH);
      } catch {
        // Storage unavailable: start as a guest.
      }

      if (access && refresh) {
        try {
          if (!state.accessToken) setTokens({ access, refresh });
          const me = await authApi.me();
          if (!cancelled) {
            queryClient.setQueryData(QUERY_KEYS.ME, me);
            setRole(me.role);
          }
        } catch {
          if (!cancelled) clearSession();
        }
      }
      if (!cancelled) setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [clearSession, setRole, setTokens]);

  if (!ready) return <PageSkeleton />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <BootProvider>
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
          {/* N-03 chat widget belongs to P5, which another branch now owns. */}
          <Toaster richColors position="bottom-left" closeButton />
        </BootProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
