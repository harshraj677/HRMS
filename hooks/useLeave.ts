"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface LeaveData {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  createdAt: string;
  fullName: string;
  department: string | null;
  leaveBalance: number;
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
    mutationFn: async (data: {
      startDate: string;
      endDate: string;
      reason: string;
    }) => {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit leave request");
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
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
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
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
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
