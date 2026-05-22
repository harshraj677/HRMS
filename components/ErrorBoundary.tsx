"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, State> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[240px] p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 mb-1">Something went wrong</h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm">{this.state.message || "An unexpected error occurred."}</p>
          <button
            type="button"
            onClick={() => { this.setState({ hasError: false, message: "" }); window.location.reload(); }}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
