"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Application error</h1>
          <p className="text-sm text-slate-500 max-w-xs mb-8">
            {error.message || "An unexpected error occurred. Please try refreshing the page."}
          </p>
          <button
            onClick={reset}
            className="flex items-center gap-2 h-10 px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload page
          </button>
          {error.digest && (
            <p className="text-[10px] text-slate-300 mt-6 font-mono">ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
