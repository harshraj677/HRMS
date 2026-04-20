"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface TodayAttendanceData {
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: string;
  distanceFromOffice: number | null;
}

export interface AttendanceRow {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  ipAddress: string | null;
  device: string | null;
  distanceFromOffice: number | null;
  fullName: string;
}

export interface AttendanceMapMarker {
  id: number;
  employeeId: number;
  fullName: string;
  latitude: number;
  longitude: number;
  checkIn: string;
  distanceFromOffice: number;
}

export function useTodayAttendance() {
  return useQuery<TodayAttendanceData>({
    queryKey: ["attendance", "today"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/today");
      if (!res.ok) throw new Error("Failed to fetch today attendance");
      return res.json();
    },
    staleTime: 3 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // poll every 5 min instead of 1 min
    refetchIntervalInBackground: false,
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

export function useAttendanceMap() {
  return useQuery<AttendanceMapMarker[]>({
    queryKey: ["attendance", "map"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/map");
      if (!res.ok) throw new Error("Failed to fetch map data");
      const json = await res.json();
      return json.markers;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000, // poll every 10 min
    refetchIntervalInBackground: false,
  });
}

/** Get current position via browser geolocation API */
function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error("Location permission denied. Please enable location access in your browser settings."));
            break;
          case err.POSITION_UNAVAILABLE:
            reject(new Error("Location information is unavailable."));
            break;
          case err.TIMEOUT:
            reject(new Error("Location request timed out. Please try again."));
            break;
          default:
            reject(new Error("Unable to determine your location."));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get geolocation first
      const location = await getCurrentPosition();

      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to check in");
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const time = new Date(data.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      toast.success(`Checked in at ${time} (${data.distance}m from office)`);
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
