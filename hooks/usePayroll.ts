"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Shared type ─────────────────────────────────────────────────────────────

export interface PayrollRecord {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  department: string | null;
  position: string | null;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  overtimePay: number;
  pfDeduction: number;
  taxDeduction: number;
  leaveDeduction: number;
  otherDeductions: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paymentStatus: string;
  generatedAt: string;
  paidAt: string | null;
  managerNotes?: string | null;
}

export interface SalaryStructure {
  id?: string;
  employeeId: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  bonus: number;
  pfDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  bankName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  panNumber: string | null;
  uanNumber: string | null;
  salaryEffectiveFrom: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Salary Structure ─────────────────────────────────────────────────────────

export function useSalaryStructure(employeeId: string) {
  return useQuery<SalaryStructure | null>({
    queryKey: ["salary-structure", employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/payroll/salary-structure/${employeeId}`);
      if (!res.ok) throw new Error("Failed to fetch salary structure");
      const json = await res.json();
      return json.structure ?? null;
    },
    enabled: !!employeeId,
  });
}

export function useUpsertSalaryStructure(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<SalaryStructure>) => {
      const res = await fetch(`/api/payroll/salary-structure/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      return json.structure as SalaryStructure;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["salary-structure", employeeId] });
      toast.success("Salary structure saved.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Admin: all payrolls ──────────────────────────────────────────────────────

export function usePayrolls(filters?: { month?: number; year?: number; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.month)  params.set("month",  String(filters.month));
  if (filters?.year)   params.set("year",   String(filters.year));
  if (filters?.status) params.set("status", filters.status);

  return useQuery<PayrollRecord[]>({
    queryKey: ["payrolls", filters],
    queryFn: async () => {
      const res = await fetch(`/api/payroll?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch payrolls");
      const json = await res.json();
      return json.payrolls;
    },
  });
}

export function useGeneratePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { month: number; year: number }) => {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      return json as { message: string; results: { employeeId: string; fullName: string; status: string; netSalary?: number }[] };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["payrolls"] });
      toast.success(data.message);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; action?: string; managerNotes?: string }) => {
      const { id, ...body } = data;
      const res = await fetch(`/api/payroll/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      return json.payroll as PayrollRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payrolls"] });
      toast.success("Payroll updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payroll/${id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Delete failed"); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payrolls"] });
      toast.success("Payroll record deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Employee: my payrolls ────────────────────────────────────────────────────

export function useMyPayrolls() {
  return useQuery<PayrollRecord[]>({
    queryKey: ["payrolls", "my"],
    queryFn: async () => {
      const res = await fetch("/api/payroll/my");
      if (!res.ok) throw new Error("Failed to fetch your payrolls");
      const json = await res.json();
      return json.payrolls;
    },
  });
}
