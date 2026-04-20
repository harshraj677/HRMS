import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,   // show cached data instantly, refresh in background after 2 min
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchIntervalInBackground: false, // stop polling when tab is hidden
    },
    mutations: {
      retry: 0,
    },
  },
});
