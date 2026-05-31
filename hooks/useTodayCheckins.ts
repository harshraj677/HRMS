"use client";

import { useQuery } from "@tanstack/react-query";

export interface TodayCheckin {
  id: string;
  employeeId: string;
  fullName: string;
  department: string | null;
  position: string | null;
  avatar: string | null;
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  distanceFromOffice: number | null;
  checkInAddress:   string | null;
  checkOutAddress:  string | null;
  hasCheckInPhoto:  boolean;
  hasCheckOutPhoto: boolean;
  faceVerified: boolean | null;
  faceScore: number | null;
  isRemote: boolean;
  reviewStatus: string;
  needsReview: boolean;
}

interface Filters {
  department?: string;
  status?: string;
}

export function useTodayCheckins(filters?: Filters) {
  const params = new URLSearchParams();
  if (filters?.department) params.set("department", filters.department);
  if (filters?.status)     params.set("status",     filters.status);

  return useQuery<TodayCheckin[]>({
    queryKey: ["attendance", "today-checkins", filters],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/today-checkins?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch today check-ins");
      return (await res.json()).checkins;
    },
    staleTime: 2 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
    refetchIntervalInBackground: false,
  });
}
