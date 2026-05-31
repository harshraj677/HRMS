import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Serve from cache instantly; refresh in background after 5 min
      staleTime: 5 * 60 * 1000,
      // Keep unused data in memory for 15 min
      gcTime: 15 * 60 * 1000,
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,
      // Don't throw on network errors — show cached data instead
      networkMode: "offlineFirst",
    },
    mutations: {
      retry: 0,
      networkMode: "always",
    },
  },
});
