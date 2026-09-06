'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/utils';
import { refreshAccessToken } from "@/lib/api";


function AuthHydrator({ children }: { children: React.ReactNode }) {
  const { setLoading, clearAuth, setInitialized } = useAuthStore()
  useEffect(() => {
    setLoading(true);
    async function hydrate() {
      try {
        await refreshAccessToken();
      } catch {
        clearAuth();
      } finally {
        setInitialized(true);
        setLoading(false);
      }
    }
    hydrate();
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: (failureCount, error: unknown) => {
              const axiosError = error as { response?: { status: number } };
              if ([401, 403, 404].includes(axiosError?.response?.status ?? 0)) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydrator>{children}</AuthHydrator>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
