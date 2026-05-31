"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ── Geofences ──────────────────────────────────────────────────────────────

export function useGeofences() {
  return useQuery({
    queryKey: ["geofences"],
    queryFn: async () => {
      const res = await fetch("/api/geofences");
      if (!res.ok) throw new Error("Failed to fetch geofences");
      return (await res.json()).geofences as any[];
    },
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      const res = await fetch("/api/policies");
      if (!res.ok) throw new Error("Failed to fetch policies");
      return (await res.json()).policies as any[];
    },
  });
}

export function useApproveOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, note }: { id: string; action: "approve" | "reject"; note?: string }) => {
      const res = await fetch(`/api/attendance/${id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(`Override ${vars.action}d.`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Phase 4 liveness types ─────────────────────────────────────────────────

/**
 * Frame-difference statistics computed client-side during the liveness challenge.
 * Sent alongside the attendance evidence; server runs the adapter to produce LivenessData.
 */
export interface LivenessClientEvidence {
  challengeType: "blink" | "passive";
  frameCount: number;
  maxFrameDiff: number;
  avgFrameDiff: number;
  frameIntervalMs: number;
  diffs: number[];
  capturedAt: number;
}

/** Liveness result stored on the attendance record. */
export interface LivenessData {
  result: "passed" | "failed" | "unknown";
  score: number;
  method: string;
  reason?: string;
}

/** Face verification result sent from the client and stored on the attendance record. */
export interface FaceVerificationData {
  confidence: number;   // 0–100
  verified: boolean;
  needsReview: boolean;
  method: string;
  error?: string;
}

export interface PolicyResultData {
  status: "ok" | "remote_ok" | "outside" | "blocked" | "review";
  distanceMeters: number | null;
  geofenceId: string | null;
  geofenceName: string | null;
  isRemote: boolean;
  policyName: string | null;
  enforcementMode: string;
  message: string;
}

// ── Phase 5 review types ───────────────────────────────────────────────────

export type ReviewStatus = "auto" | "flagged" | "approved" | "rejected";

export interface ReviewQueueItem {
  id: string;
  employeeId: string;
  fullName: string;
  department: string | null;
  email: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: string;
  reviewStatus: ReviewStatus;
  reviewedAt: string | null;
  reviewNotes: string | null;
  needsReview: boolean;
  faceVerified: boolean | null;
  faceScore: number | null;
  livenessResult: string | null;
  livenessScore: number | null;
  policyResult: PolicyResultData | null;
  isRemote: boolean;
  manualOverride: boolean;
  overrideNote: string | null;
  distanceFromOffice: number | null;
  checkInPhoto: string | null;
  device: string | null;
}

export interface ReviewQueueResponse {
  queue: ReviewQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useReviewQueue(params: {
  page?: number;
  limit?: number;
  reviewStatus?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  minFaceScore?: number;
  liveness?: string;
}) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.reviewStatus) search.set("reviewStatus", params.reviewStatus);
  if (params.department) search.set("department", params.department);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  if (params.minFaceScore != null) search.set("minFaceScore", String(params.minFaceScore));
  if (params.liveness) search.set("liveness", params.liveness);

  return useQuery<ReviewQueueResponse>({
    queryKey: ["attendance", "review-queue", params],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/review-queue?${search.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch review queue");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}

export function useAttendanceAuditTrail(attendanceId: string) {
  return useQuery({
    queryKey: ["attendance", "audit", attendanceId],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/${attendanceId}/audit`);
      if (!res.ok) throw new Error("Failed to fetch audit trail");
      return (await res.json()).trail as any[];
    },
    enabled: !!attendanceId,
  });
}

export function useBulkReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { ids: string[]; action: "approved" | "rejected"; reason: string }) => {
      const res = await fetch("/api/attendance/bulk-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Bulk review failed");
      return json;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["attendance", "review-queue"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(data.message ?? "Bulk action completed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReviewRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; action: "approved" | "rejected"; reason: string; notes?: string }) => {
      const res = await fetch(`/api/attendance/${data.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: data.action, reason: data.reason, notes: data.notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Review failed");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance", "review-queue"] });
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Record reviewed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface TodayAttendanceData {
  checkIn: string | null;
  checkOut: string | null;
  hours: number | null;
  status: string;
  distanceFromOffice: number | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  checkInAddress: string | null;
  checkOutAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  faceVerified: boolean | null;
  faceScore: number | null;
  needsReview: boolean;
  policyResult: PolicyResultData | null;
  isRemote: boolean;
  manualOverride: boolean;
  livenessResult: "passed" | "failed" | "unknown" | null;
  livenessScore: number | null;
  reviewStatus: ReviewStatus;
  reviewNotes: string | null;
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
  hasCheckInPhoto:  boolean;
  hasCheckOutPhoto: boolean;
  checkInAccuracy:  number | null;
  checkOutAccuracy: number | null;
  checkInAddress:   string | null;
  checkOutAddress:  string | null;
  faceVerified: boolean | null;
  faceScore: number | null;
  needsReview: boolean;
  policyResult: PolicyResultData | null;
  isRemote: boolean;
  manualOverride: boolean;
  overrideNote: string | null;
  livenessResult: "passed" | "failed" | "unknown" | null;
  livenessScore: number | null;
  reviewStatus: ReviewStatus;
  reviewedAt: string | null;
  reviewNotes: string | null;
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
  faceVerification?: FaceVerificationData | null;
  /** Phase 4: frame-diff statistics from the liveness challenge. */
  livenessEvidence?: LivenessClientEvidence | null;
  /** Set by the attendance UI when employee explicitly requests a manual override. */
  overrideRequested?: boolean;
  overrideNote?: string;
}

/** Parsed from a 403 response when the policy blocks check-in but override is allowed. */
export interface OverridePrompt {
  reason: string;
  policyResult: PolicyResultData | null;
  overrideAllowed: true;
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
/** Special error class carrying override-prompt metadata from a policy block. */
export class PolicyBlockError extends Error {
  constructor(
    message: string,
    public readonly overridePrompt: OverridePrompt
  ) {
    super(message);
    this.name = "PolicyBlockError";
  }
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error | PolicyBlockError, AttendanceEvidence | undefined>({
    mutationFn: async (evidence) => {
      const location = evidence ?? (await getCurrentPosition());

      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(location),
      });
      const json = await res.json();
      if (!res.ok) {
        // Policy block with override option
        if (res.status === 403 && json.overrideAllowed === true) {
          throw new PolicyBlockError(json.error || "Blocked by policy", {
            reason: json.error,
            policyResult: json.policyResult ?? null,
            overrideAllowed: true,
          });
        }
        throw new Error(json.error || "Failed to check in");
      }
      return json;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      const time = new Date(data.checkIn).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const suffix = data.policyResult?.isRemote
        ? " (remote)"
        : data.distance != null
        ? ` (${data.distance}m from office)`
        : "";
      toast.success(`Checked in at ${time}${suffix}`);
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
          evidence
            ? {
                photo: evidence.photo,
                accuracy: evidence.accuracy,
                latitude: evidence.latitude,
                longitude: evidence.longitude,
              }
            : {}
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
