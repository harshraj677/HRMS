"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  department?: string;
  position?: string;
  phone?: string;
  leaveBalance: number;
  mustChangePassword: boolean;
  status: string;
  createdAt: string;
}

export function useAuth() {
  return useQuery<AuthUser>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Not authenticated");
      const json = await res.json();
      return json.user;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to change password");
      return json;
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useLoginHistory(employeeId?: number) {
  return useQuery({
    queryKey: ["auth", "login-history", employeeId],
    queryFn: async () => {
      const url = employeeId
        ? `/api/auth/login-history?employeeId=${employeeId}`
        : "/api/auth/login-history";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch login history");
      const json = await res.json();
      return json.history;
    },
  });
}
