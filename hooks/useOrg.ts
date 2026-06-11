"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface DepartmentData {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  managerId: string | null;
  managerName: string | null;
  status: string;
  employeeCount: number;
  createdAt: string;
}

export interface DesignationData {
  id: string;
  title: string;
  level: number;
  departmentId: string | null;
  createdAt: string;
}

export interface DirectoryEmployee {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  role: string;
  createdAt: string;
  reportingManagerId: string | null;
  managerName: string | null;
  profile: {
    avatar: string | null;
    skills: string[];
    workLocation: string | null;
    employmentStatus: string | null;
  } | null;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  role: string;
  leaveBalance: number;
  createdAt: string;
  profile: { avatar: string | null; employmentStatus: string | null } | null;
  todayAttendance: { status: string; checkIn: string | null; checkOut: string | null; hours: number | null } | null;
  pendingLeaves: number;
}

export interface OrgTreeEmployee {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  role: string;
  reportingManagerId: string | null;
  managerName: string | null;
  createdAt?: string;
  profile: { avatar: string | null; workLocation: string | null } | null;
}

export interface AnnouncementData {
  id: string;
  title: string;
  content: string;
  audience: string;
  targetDept: string | null;
  isPinned: boolean;
  createdById: string;
  createdAt: string;
  createdBy: { fullName: string; position: string | null };
}

// ─── Departments ──────────────────────────────────────────────────────────────

export function useDepartments() {
  return useQuery<DepartmentData[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/org/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      return (await res.json()).departments;
    },
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; code?: string; description?: string; managerId?: string }) => {
      const res = await fetch("/api/org/departments", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.department as DepartmentData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department created."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<DepartmentData> & { id: string }) => {
      const { id, ...body } = data;
      const res = await fetch(`/api/org/departments/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.department as DepartmentData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department updated."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/org/departments/${id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["departments"] }); toast.success("Department deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Designations ─────────────────────────────────────────────────────────────

export function useDesignations() {
  return useQuery<DesignationData[]>({
    queryKey: ["designations"],
    queryFn: async () => {
      const res = await fetch("/api/org/designations");
      if (!res.ok) throw new Error("Failed to fetch designations");
      return (await res.json()).designations;
    },
  });
}

export function useCreateDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; level?: number; departmentId?: string }) => {
      const res = await fetch("/api/org/designations", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.designation as DesignationData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["designations"] }); toast.success("Designation created."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDesignation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch("/api/org/designations", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["designations"] }); toast.success("Designation deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Directory ────────────────────────────────────────────────────────────────

export function useDirectory(filters?: { search?: string; department?: string }) {
  const params = new URLSearchParams();
  if (filters?.search)     params.set("search",     filters.search);
  if (filters?.department) params.set("department", filters.department);

  return useQuery<DirectoryEmployee[]>({
    queryKey: ["directory", filters],
    queryFn: async () => {
      const res = await fetch(`/api/org/directory?${params.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).employees;
    },
  });
}

// ─── My Team ──────────────────────────────────────────────────────────────────

export function useMyTeam() {
  return useQuery<TeamMember[]>({
    queryKey: ["my-team"],
    queryFn: async () => {
      const res = await fetch("/api/org/my-team");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).team;
    },
  });
}

export function useAssignManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { employeeId: string; managerId: string | null }) => {
      const res = await fetch("/api/org/my-team", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-team"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["org-tree"] });
      toast.success("Reporting manager updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Org Structure Tree ───────────────────────────────────────────────────────

export function useOrgTree() {
  return useQuery<OrgTreeEmployee[]>({
    queryKey: ["org-tree"],
    queryFn: async () => {
      const res = await fetch("/api/org/tree");
      if (!res.ok) throw new Error("Failed to fetch org tree");
      return (await res.json()).employees;
    },
    staleTime: 60 * 1000,
  });
}

// ─── Announcements ────────────────────────────────────────────────────────────

export function useAnnouncements() {
  return useQuery<AnnouncementData[]>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).announcements;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; content: string; audience?: string; targetDept?: string; isPinned?: boolean }) => {
      const res = await fetch("/api/announcements", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.announcement as AnnouncementData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Announcement posted."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Announcement deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTogglePinAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPinned }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}
