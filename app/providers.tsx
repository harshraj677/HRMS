"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
    <ErrorBoundary>
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
    </QueryClientProvider>
    </ErrorBoundary>
    </ThemeProvider>
  );
}
