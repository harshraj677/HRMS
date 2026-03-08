"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface TodayAttendanceData {
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: string;
}

export interface AttendanceRow {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  fullName: string;
}

export function useTodayAttendance() {
  return useQuery<TodayAttendanceData>({
    queryKey: ["attendance", "today"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/today");
      if (!res.ok) throw new Error("Failed to fetch today attendance");
      return res.json();
    },
    refetchInterval: 60000,
  });
}

export function useAttendanceHistory(employeeId?: string | number) {
  return useQuery<AttendanceRow[]>({
    queryKey: ["attendance", "history", employeeId],
    queryFn: async () => {
      const url = employeeId ? `/api/attendance?employeeId=${employeeId}` : "/api/attendance";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch attendance history");
      const json = await res.json();
      return json.attendance;
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/attendance/checkin", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to check in");
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const time = new Date(data.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      toast.success(`Checked in at ${time}`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/attendance/checkout", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to check out");
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const time = new Date(data.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      toast.success(`Checked out at ${time} — ${data.hours}h worked`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
