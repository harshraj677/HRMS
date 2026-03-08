"use client";

import { useQuery } from "@tanstack/react-query";

export interface DashboardStatsData {
  totalEmployees: number;
  presentToday: number;
  onLeave: number;
  pendingLeaveRequests: number;
  percentPresent: number;
}

export function useDashboardStats() {
  return useQuery<DashboardStatsData>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
  });
}
