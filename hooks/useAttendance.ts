"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface TodayAttendanceData {
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: string;
  distanceFromOffice: number | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
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
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  checkInAccuracy: number | null;
  checkOutAccuracy: number | null;
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

/** Data captured by AttendanceCaptureModal and passed to check-in/out mutations. */
export interface AttendanceEvidence {
  latitude: number;
  longitude: number;
  accuracy: number;
  photo: string | null;
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
    refetchInterval: 5 * 60 * 1000,
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
    refetchInterval: 10 * 60 * 1000,
    refetchIntervalInBackground: false,
  });
}

/** Get current GPS position from browser. Used as fallback when no evidence is passed. */
function getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(
              new Error(
                "Location permission denied. Please enable location access in your browser settings."
              )
            );
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

/**
 * Check-in mutation.
 * - Called with no args from the dashboard quick-button: falls back to GPS-only, no photo.
 * - Called with AttendanceEvidence from the capture modal: sends photo + GPS.
 */
export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, AttendanceEvidence | undefined>({
    mutationFn: async (evidence) => {
      const location = evidence ?? (await getCurrentPosition());

      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to check in");
      return json;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const time = new Date(data.checkIn).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      toast.success(`Checked in at ${time} (${data.distance}m from office)`);
    },
  });
}

/**
 * Check-out mutation.
 * - Called with no args from the dashboard quick-button: sends empty body, no photo.
 * - Called with AttendanceEvidence from the capture modal: sends photo + accuracy.
 */
export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, AttendanceEvidence | undefined>({
    mutationFn: async (evidence) => {
      const res = await fetch("/api/attendance/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          evidence ? { photo: evidence.photo, accuracy: evidence.accuracy } : {}
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to check out");
      return json;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const time = new Date(data.checkOut).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      toast.success(`Checked out at ${time} — ${data.hours}h worked`);
    },
  });
}
