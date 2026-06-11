"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, RefreshCcw, Loader2, ListChecks,
  CheckCircle2, AlertTriangle, CalendarDays, Gauge,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";
import { RoleGuard } from "@/components/RoleGuard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePerformanceOverview, useEmployeePerformance, useGeneratePerformance } from "@/hooks/usePerformance";
import { ScoreRing } from "@/components/performance/ScoreRing";
import { getCurrentPeriod, previousPeriod, nextPeriod, periodLabel, type PeriodType } from "@/lib/performance";
import PerformanceAdminPanel from "./PerformanceAdminPanel";

const PERIOD_TYPES: PeriodType[] = ["monthly", "quarterly", "yearly"];

function SubScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{Math.round(value)}</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color }: { icon: typeof ListChecks; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900">{value}</p>
        <p className="text-[11px] text-slate-500 truncate">{label}</p>
      </div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-slate-600">Overall score: <strong className="text-slate-900">{payload[0].value}</strong></p>
    </div>
  );
}

export default function PerformancePage() {
  const { data: user } = useAuth();
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [period, setPeriod] = useState<string>(() => getCurrentPeriod("monthly"));

  function handlePeriodTypeChange(pt: PeriodType) {
    setPeriodType(pt);
    setPeriod(getCurrentPeriod(pt));
  }

  const { data, isLoading } = usePerformanceOverview(period, periodType);
  const { data: history } = useEmployeePerformance(user ? String(user.id) : null, periodType);
  const generate = useGeneratePerformance();

  const isPrivileged = !!user && ["admin", "hr", "manager"].includes(user.role);
  const currentPeriod = getCurrentPeriod(periodType);
  const self = data?.self ?? null;

  const trendData = (history?.history ?? []).map((h) => ({
    label: periodLabel(h.period, h.periodType),
    overallScore: Math.round(h.overallScore),
  }));

  return (
    <RoleGuard allow={["admin", "hr", "manager", "employee"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Performance</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isPrivileged ? "Track team performance, rankings, and insights" : "Your performance overview and trends"}
            </p>
          </div>
          <Tabs value={periodType} onValueChange={(v) => handlePeriodTypeChange(v as PeriodType)}>
            <TabsList>
              {PERIOD_TYPES.map((pt) => (
                <TabsTrigger key={pt} value={pt} className="capitalize">{pt}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Period navigation */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setPeriod(previousPeriod(period, periodType))}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
            aria-label="Previous period"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700 min-w-[140px] text-center">
            {periodLabel(period, periodType)}
          </span>
          <button
            type="button"
            onClick={() => setPeriod(nextPeriod(period, periodType))}
            disabled={period === currentPeriod}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next period"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {isPrivileged && (
            <button
              type="button"
              onClick={() => generate.mutate({ period, periodType })}
              disabled={generate.isPending}
              className="ml-2 h-8 px-3 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors flex items-center gap-1.5"
            >
              {generate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
              Generate
            </button>
          )}
        </div>

        {/* Self performance card */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-6">
              {self ? (
                <>
                  <div className="flex items-center gap-4 sm:border-r sm:border-slate-100 sm:pr-6">
                    <ScoreRing score={self.overallScore} label="Overall" />
                    <div>
                      <p className={cn("text-xs font-semibold px-2.5 py-1 rounded-full inline-block", self.className)}>
                        {self.label}
                      </p>
                      <p className="text-sm font-semibold text-slate-800 mt-2">{self.fullName}</p>
                      <p className="text-xs text-slate-400">{periodLabel(self.period, self.periodType)}</p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <SubScoreBar label="Attendance" value={self.attendanceScore} />
                    <SubScoreBar label="Tasks" value={self.taskScore} />
                    <SubScoreBar label="Leave" value={self.leaveScore} />
                    {self.trainingCompletionPercent > 0 && <SubScoreBar label="Training" value={self.trainingScore} />}
                    {(self.managerFeedbackScore > 0 || self.peerFeedbackScore > 0) && (
                      <SubScoreBar label="Manager Feedback" value={self.managerFeedbackScore} />
                    )}
                    {self.peerFeedbackScore > 0 && <SubScoreBar label="Peer Feedback" value={self.peerFeedbackScore} />}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                    <Gauge className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">No performance data for this period</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {isPrivileged ? "Click Generate to compute scores for this period." : "Check back once your performance for this period has been generated."}
                  </p>
                </div>
              )}
            </div>

            {self && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
                <StatTile icon={ListChecks} label="Tasks Assigned" value={self.tasksAssigned} color="bg-indigo-100 text-indigo-600" />
                <StatTile icon={CheckCircle2} label="Tasks Completed" value={self.tasksCompleted} color="bg-emerald-100 text-emerald-600" />
                <StatTile icon={AlertTriangle} label="Tasks Overdue" value={self.tasksOverdue} color="bg-red-100 text-red-600" />
                <StatTile icon={CalendarDays} label="Attendance" value={`${Math.round(self.attendancePercent)}%`} color="bg-sky-100 text-sky-600" />
              </div>
            )}
          </motion.div>
        )}

        {/* Trend chart */}
        {trendData.length > 1 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <RTooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="overallScore" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Admin / HR / Manager panel */}
        {isPrivileged && data && (
          <PerformanceAdminPanel data={data} isAdminOrHr={user?.role === "admin" || user?.role === "hr"} />
        )}
      </div>
    </RoleGuard>
  );
}
