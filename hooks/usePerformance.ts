"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { PeriodType, PerformanceBand, RecommendationType } from "@/lib/performance";

export interface PerformanceRecordView {
  employeeId: string;
  fullName: string;
  department: string | null;
  role: string;
  avatar: string | null;
  period: string;
  periodType: PeriodType;
  attendanceScore: number;
  taskScore: number;
  leaveScore: number;
  trainingScore: number;
  managerFeedbackScore: number;
  peerFeedbackScore: number;
  overallScore: number;
  attendancePercent: number;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  leavesTaken: number;
  trainingCompletionPercent: number;
  generatedAt: string;
  band: PerformanceBand;
  label: string;
  className: string;
}

export interface PerformanceRecommendationView {
  id: string;
  employeeId: string;
  fullName: string;
  department: string | null;
  period: string;
  type: RecommendationType;
  note: string | null;
  generatedAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
}

export interface PerformanceOverviewResponse {
  period: string;
  periodType: PeriodType;
  self: PerformanceRecordView | null;
  records: PerformanceRecordView[];
  rankings: PerformanceRecordView[];
  departmentBreakdown: { department: string; avgScore: number; count: number }[];
  topPerformers: PerformanceRecordView[];
  needsAttention: PerformanceRecordView[];
  recommendations: PerformanceRecommendationView[];
}

export function usePerformanceOverview(period: string, periodType: PeriodType) {
  return useQuery<PerformanceOverviewResponse>({
    queryKey: ["performance", "overview", periodType, period],
    queryFn: async () => {
      const res = await fetch(`/api/performance?period=${encodeURIComponent(period)}&periodType=${periodType}`);
      if (!res.ok) throw new Error("Failed to fetch performance overview");
      return res.json();
    },
    enabled: !!period && !!periodType,
  });
}

export interface PerformanceHistoryResponse {
  employee: { id: string; fullName: string; department: string | null; role: string; avatar: string | null };
  periodType: PeriodType;
  history: PerformanceRecordView[];
  recommendations: PerformanceRecommendationView[];
}

export function useEmployeePerformance(employeeId: string | null, periodType: PeriodType) {
  return useQuery<PerformanceHistoryResponse>({
    queryKey: ["performance", "history", employeeId, periodType],
    queryFn: async () => {
      const res = await fetch(`/api/performance/${employeeId}?periodType=${periodType}`);
      if (!res.ok) throw new Error("Failed to fetch performance history");
      return res.json();
    },
    enabled: !!employeeId,
  });
}

export function useGeneratePerformance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ period, periodType }: { period: string; periodType: PeriodType }) => {
      const res = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, periodType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate performance records");
      return json as { message: string; generated: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["performance"] });
      toast.success(data.message);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
