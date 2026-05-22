"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertTriangle, AlertCircle, Info, CheckCircle2,
  ArrowRight, RefreshCw, Sparkles, Loader2,
} from "lucide-react";
import Link from "next/link";
import { RoleGuard } from "@/components/RoleGuard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AIInsight } from "@/app/api/ai/insights/route";

const SEVERITY_META = {
  critical: {
    icon:   AlertCircle,
    border: "border-red-200",
    bg:     "bg-red-50",
    badge:  "bg-red-100 text-red-700",
    dot:    "bg-red-500",
    icon_color: "text-red-600",
  },
  warning: {
    icon:   AlertTriangle,
    border: "border-amber-200",
    bg:     "bg-amber-50",
    badge:  "bg-amber-100 text-amber-700",
    dot:    "bg-amber-500",
    icon_color: "text-amber-600",
  },
  info: {
    icon:   Info,
    border: "border-sky-200",
    bg:     "bg-sky-50",
    badge:  "bg-sky-100 text-sky-700",
    dot:    "bg-sky-500",
    icon_color: "text-sky-600",
  },
  success: {
    icon:   CheckCircle2,
    border: "border-emerald-200",
    bg:     "bg-emerald-50",
    badge:  "bg-emerald-100 text-emerald-700",
    dot:    "bg-emerald-500",
    icon_color: "text-emerald-600",
  },
};

function useAIInsights() {
  return useQuery<AIInsight[]>({
    queryKey: ["ai-insights"],
    queryFn: async () => {
      const res = await fetch("/api/ai/insights");
      if (!res.ok) throw new Error("Failed to fetch insights");
      return (await res.json()).insights;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchIntervalInBackground: false,
  });
}

export default function AIInsightsPage() {
  const { data: insights, isLoading, refetch, isFetching } = useAIInsights();

  const critical = (insights ?? []).filter((i) => i.severity === "critical");
  const warnings = (insights ?? []).filter((i) => i.severity === "warning");
  const infos    = (insights ?? []).filter((i) => i.severity === "info");
  const successes= (insights ?? []).filter((i) => i.severity === "success");

  return (
    <RoleGuard allow={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">AI Insights</h2>
              <p className="text-sm text-slate-500 mt-0.5">Data-driven alerts across all HR modules</p>
            </div>
          </div>
          <button type="button" onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-2 h-9 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>

        {/* Summary row */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Critical",  count: critical.length,  color: "red"     },
              { label: "Warnings",  count: warnings.length,  color: "amber"   },
              { label: "Info",      count: infos.length,     color: "sky"     },
              { label: "Positive",  count: successes.length, color: "emerald" },
            ].map(({ label, count, color }) => (
              <div key={label} className={cn("rounded-2xl border p-4 text-center",
                color === "red"     && "bg-red-50     border-red-100",
                color === "amber"   && "bg-amber-50   border-amber-100",
                color === "sky"     && "bg-sky-50     border-sky-100",
                color === "emerald" && "bg-emerald-50 border-emerald-100",
              )}>
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className={cn("text-[10px] font-semibold uppercase tracking-widest mt-0.5",
                  color === "red" && "text-red-500", color === "amber" && "text-amber-500",
                  color === "sky" && "text-sky-500", color === "emerald" && "text-emerald-500",
                )}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Insights list */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : (insights?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center py-20 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-300 mb-4" />
            <p className="text-base font-semibold text-slate-700">Everything looks great!</p>
            <p className="text-sm text-slate-400 mt-1">No issues detected across all HR modules</p>
          </div>
        ) : (
          <div className="space-y-3">
            {insights?.map((insight, i) => {
              const meta = SEVERITY_META[insight.severity];
              const Icon = meta.icon;
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn("rounded-2xl border p-4 transition-all hover:shadow-sm", meta.border, meta.bg)}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm", meta.border, "border")}>
                      <Icon className={cn("w-4 h-4", meta.icon_color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-slate-900">{insight.title}</p>
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest", meta.badge)}>
                          {insight.module}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{insight.description}</p>
                    </div>

                    {insight.href && (
                      <Link href={insight.href}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all shrink-0 shadow-sm">
                        View <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Info note */}
        <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Insights are generated from real-time data across all HR modules. They refresh automatically every 10 minutes.
            Critical items require immediate attention; informational items are suggestions for improvement.
          </p>
        </div>
      </div>
    </RoleGuard>
  );
}
