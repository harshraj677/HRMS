"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ResignationData {
  id: string;
  employeeId: string;
  employeeName?: string;
  department?: string | null;
  position?: string | null;
  reason: string;
  lastWorkingDay: string;
  status: string;
  managerComment: string | null;
  hrComment: string | null;
  exitFeedback: string | null;
  laptopReturned: boolean;
  idCardReturned: boolean;
  payrollCleared: boolean;
  docsHandedOver: boolean;
  createdAt: string;
}

export function useMyResignation() {
  return useQuery<ResignationData | null>({
    queryKey: ["resignation", "my"],
    queryFn: async () => {
      const res = await fetch("/api/resignation");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).resignation ?? null;
    },
  });
}

export function useAllResignations() {
  return useQuery<ResignationData[]>({
    queryKey: ["resignation", "all"],
    queryFn: async () => {
      const res = await fetch("/api/resignation");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).resignations ?? [];
    },
  });
}

export function useSubmitResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { reason: string; lastWorkingDay: string }) => {
      const res = await fetch("/api/resignation", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.resignation as ResignationData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["resignation"] });
      toast.success("Resignation submitted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateResignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ResignationData> & { id: string }) => {
      const res = await fetch(`/api/resignation/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.resignation as ResignationData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resignation"] }); toast.success("Updated."); },
    onError: (e: Error) => toast.error(e.message),
  });
}
