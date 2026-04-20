"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface EmployeeData {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  role: string;
  leaveBalance: number;
  createdAt: string;
}

export function useEmployees(filters?: { department?: string; search?: string }) {
  return useQuery<EmployeeData[]>({
    queryKey: ["employees", filters],
    queryFn: async () => {
      const res = await fetch("/api/employees");
      if (!res.ok) throw new Error("Failed to fetch employees");
      const json = await res.json();
      let result: EmployeeData[] = json.employees;

      if (filters?.department && filters.department !== "all") {
        result = result.filter(
          (e) => e.department?.toLowerCase() === filters.department!.toLowerCase()
        );
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (e) =>
            e.fullName.toLowerCase().includes(q) ||
            e.email.toLowerCase().includes(q) ||
            (e.position?.toLowerCase().includes(q) ?? false)
        );
      }
      return result;
    },
  });
}

export function useEmployee(id: string | number) {
  return useQuery<EmployeeData | undefined>({
    queryKey: ["employees", id],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) return undefined;
      const json = await res.json();
      return json.employee;
    },
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      fullName: string;
      email: string;
      phone?: string;
      department?: string;
      position?: string;
      role?: string;
    }) => {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create employee");
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(data.message || "Employee created successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete employee");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee deleted.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
