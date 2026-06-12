"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LeaveSubmitPayload } from "@/types/leave";

export interface LeaveData {
  id:             string;
  employeeId:     string;
  startDate:      string;
  endDate:        string;
  days:           number;
  totalHours:     number;
  totalDays:      number;
  durationType:   string;
  sessionType:    string | null;
  startTime:      string | null;
  endTime:        string | null;
  reason:         string;
  category:       string;
  status:         string;
  managerComment: string | null;
  createdAt:      string;
  fullName:       string;
  department:     string | null;
  leaveBalance:   number;
}

export function useLeaveRequests() {
  return useQuery<LeaveData[]>({
    queryKey: ["leave", "requests"],
    queryFn: async () => {
      const res = await fetch("/api/leave");
      if (!res.ok) throw new Error("Failed to fetch leave requests");
      const json = await res.json();
      return json.leaves;
    },
  });
}

export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: LeaveSubmitPayload) => {
      const res = await fetch("/api/leave", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
      });
      // Safely parse response — server may return HTML on unhandled errors
      const text = await res.text();
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { /* non-JSON body */ }
      if (!res.ok) throw new Error((json.error as string) || `Server error (${res.status}). Please try again.`);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast.success("Leave request submitted successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useApproveLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leave/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "approve" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to approve");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Leave request approved!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useRejectLeave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/leave/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "reject" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reject");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave"] });
      toast.success("Leave request rejected.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export interface LeaveDeleteParams {
  id:                  string;
  confirmName:         string;
  archiveBeforeDelete: boolean;
  permanentPurge:      boolean;
}

export function useDeleteLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      confirmName,
      archiveBeforeDelete,
      permanentPurge,
    }: LeaveDeleteParams) => {
      const res = await fetch(`/api/leave/${id}`, {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ confirmName, archiveBeforeDelete, permanentPurge }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete leave request");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave"] });
      toast.success("Leave request deleted.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
