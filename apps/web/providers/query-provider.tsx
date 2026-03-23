'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000,  // 2 minutes — don't refetch if data is fresh
            gcTime: 10 * 60 * 1000,     // 10 minutes — keep in cache
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,       // Don't refetch when component remounts (tab switch)
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}