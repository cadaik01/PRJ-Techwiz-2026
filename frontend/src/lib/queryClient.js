import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      // A 401 is handled by the axios refresh queue; retrying here only duplicates
      // work and delays the redirect to /login.
      retry: (failureCount, error) =>
        error?.response?.status !== 401 && failureCount < 1,
    },
  },
});
