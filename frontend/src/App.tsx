import { useEffect, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Toaster } from 'sonner';

import { authApi } from '@/api/common/authApi';
import { catalogApi } from '@/api/guest/catalogApi';
import { AiChatWidget } from '@/components/common/chat/AiChatWidget';
import { ErrorBoundary } from '@/components/common/feedback/ErrorBoundary';
import { PageSkeleton } from '@/components/common/feedback/PageSkeleton';
import { TooltipProvider } from '@/components/common/layout/Tooltip';
import { QUERY_KEYS, STORAGE_KEYS } from '@/config/constants';
import { env } from '@/config/env';
import { queryClient } from '@/lib/queryClient';
import { router } from '@/router/AppRouter';
import { useAuthStore } from '@/stores/auth.store';

let mockingStarted = false;

async function enableMocking() {
  if (!env.USE_MOCK || mockingStarted) return;
  const { worker } = await import('@/mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  });
  mockingStarted = true;
}

function waitForAuthHydration(): Promise<void> {
  if (useAuthStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

function BootProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setRole = useAuthStore((s) => s.setRole);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    const onLost = () => {
      clearSession();
      queryClient.clear();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    };
    window.addEventListener('auth:session-lost', onLost);
    return () => window.removeEventListener('auth:session-lost', onLost);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      await waitForAuthHydration();
      await enableMocking();

      try {
        const config = await catalogApi.getConfig();
        if (!cancelled) {
          queryClient.setQueryData(QUERY_KEYS.PUBLIC_CONFIG, config);
        }
      } catch {
        // Config is non-blocking for Phase 1 shell.
      }

      const state = useAuthStore.getState();
      let token = state.accessToken;
      let refresh = state.refreshToken;
      try {
        token = token || localStorage.getItem(STORAGE_KEYS.ACCESS);
        refresh = refresh || localStorage.getItem(STORAGE_KEYS.REFRESH);
      } catch {
        // Storage unavailable.
      }

      if (token && refresh) {
        try {
          if (!state.accessToken) {
            setTokens({ access: token, refresh });
          }
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

  if (!ready) {
    return <PageSkeleton />;
  }

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
          <AiChatWidget />
          {/* reset.css gives #root `isolation: isolate`, so everything rendered inside it is
              trapped below the Sheet / Dialog overlays that Radix portals to <body> - the
              toast ended up behind a blurred, dimmed backdrop. Portalling it to <body> too
              puts it back in the same stacking context, where its own z-index wins. */}
          {createPortal(
            <Toaster richColors position="bottom-left" closeButton />,
            document.body,
          )}
        </BootProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
