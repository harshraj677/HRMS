"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/queryClient";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
          },
          classNames: {
            toast: "rounded-xl shadow-lg",
            success: "border-l-4 border-l-emerald-500",
            error: "border-l-4 border-l-red-500",
          },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
