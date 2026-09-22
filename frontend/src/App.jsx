import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { queryClient } from './lib/queryClient';
import { AppRouter } from './router/AppRouter';

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
