"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  const isNetworkError =
    error.message?.includes("fetch") ||
    error.message?.includes("network") ||
    error.message?.includes("Failed to fetch");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6 shadow-sm">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>

      <h2 className="text-xl font-bold text-slate-900 mb-2">
        {isNetworkError ? "Connection error" : "Something went wrong"}
      </h2>
      <p className="text-sm text-slate-500 text-center max-w-sm mb-8">
        {isNetworkError
          ? "Could not reach the server. Make sure the dev server is running and try again."
          : error.message || "An unexpected error occurred."}
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all shadow-sm shadow-indigo-500/25"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 h-10 px-5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 active:scale-95 transition-all"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {error.digest && (
        <p className="text-[10px] text-slate-300 mt-6 font-mono">
          Error ID: {error.digest}
        </p>
      )}
    </div>
  );
}
