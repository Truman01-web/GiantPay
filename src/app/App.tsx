import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/feedback/Toaster';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { SessionProvider } from './providers/SessionProvider';
import { router } from '@active-router';
import { RouteMetadata } from '@/components/marketing/RouteMetadata';

export function App() {
  return (
    <ErrorBoundary boundaryName="GiantPay">
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <RouteMetadata />
          <RouterProvider router={router} />
          <Toaster />
        </SessionProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
