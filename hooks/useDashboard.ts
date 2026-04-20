"use client";

import { useQuery } from "@tanstack/react-query";

export interface AdminDashboardStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  onLeave: number;
  pendingLeaveRequests: number;
  percentPresent: number;
}

export interface EmployeeDashboardStats {
  monthlyAttendance: number;
  monthlyLate: number;
  monthlyLeaves: number;
  pendingRequests: number;
  leaveBalance: number;
}

export function useDashboardStats() {
  return useQuery<AdminDashboardStats & EmployeeDashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });
}
