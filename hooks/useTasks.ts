"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "under_review",
  "completed",
  "blocked",
  "on_hold",
  "cancelled",
] as const;

export const TASK_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export const TASK_PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface TaskAttachment {
  name: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface TaskData {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  department: string | null;
  dueDate: string | null;
  assignedById: string;
  assignedToId: string;
  assigneeName: string;
  assignerName: string;
  attachments: TaskAttachment[];
  tags: string[];
  startedAt: string | null;
  completedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
  isOverdue?: boolean;
  comments?: TaskCommentData[];
  progressLogs?: TaskProgressLogData[];
  assignee?: { id: string; fullName: string; department: string | null; position: string | null; role: string } | null;
  assigner?: { id: string; fullName: string; department: string | null; position: string | null; role: string } | null;
}

export interface TaskCommentData {
  id: string;
  taskId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  parentId: string | null;
  mentions: string[];
  attachments: TaskAttachment[];
  createdAt: string;
}

export interface TaskProgressLogData {
  id: string;
  taskId: string;
  changedById: string;
  changedByName: string;
  field: "status" | "progress";
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
  oldLabel?: string | null;
  newLabel?: string | null;
  note: string | null;
  createdAt: string;
}

export interface TaskActivityEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  entityId: string | null;
  entityName: string | null;
  detail: string | null;
  createdAt: string;
}

export interface AssignableEmployee {
  id: string;
  fullName: string;
  department: string | null;
  position: string | null;
  role: string;
}

export interface TaskAnalytics {
  totals: { total: number; completed: number; pending: number; overdue: number; blocked: number };
  statusBreakdown: Record<string, number>;
  byDepartment: { department: string; total: number; completed: number; overdue: number; completionRate: number }[];
  topPerformers: { employeeId: string; fullName: string; department: string | null; assigned: number; completed: number; overdue: number; completionRate: number }[];
  needsAttention: { employeeId: string; fullName: string; department: string | null; assigned: number; completed: number; overdue: number; completionRate: number }[];
  trend: { date: string; completed: number }[];
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  department?: string;
  assignedToId?: string;
  search?: string;
  view?: "list" | "board" | "calendar";
  scope?: "all" | "assigned" | "created";
  from?: string;
  to?: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  department?: string | null;
  assignedToId: string;
  attachments?: TaskAttachment[];
  tags?: string[];
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  progress?: number;
  dueDate?: string | null;
  department?: string | null;
  assignedToId?: string;
  tags?: string[];
  attachments?: TaskAttachment[];
  appendAttachments?: TaskAttachment[];
}

function buildQuery(filters?: TaskFilters) {
  const p = new URLSearchParams();
  if (!filters) return p.toString();
  if (filters.status && filters.status !== "all") p.set("status", filters.status);
  if (filters.priority && filters.priority !== "all") p.set("priority", filters.priority);
  if (filters.department && filters.department !== "all") p.set("department", filters.department);
  if (filters.assignedToId) p.set("assignedToId", filters.assignedToId);
  if (filters.search) p.set("search", filters.search);
  if (filters.view) p.set("view", filters.view);
  if (filters.scope) p.set("scope", filters.scope);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  return p.toString();
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export function useTasks(filters?: TaskFilters) {
  const qs = buildQuery(filters);
  return useQuery<TaskData[]>({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      const res = await fetch(`/api/tasks${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load tasks");
      return (await res.json()).tasks;
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
  });
}

export function useTask(id: string) {
  return useQuery<TaskData>({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) throw new Error("Failed to load task");
      return (await res.json()).task;
    },
    enabled: !!id,
    refetchInterval: 20 * 1000,
    refetchIntervalInBackground: false,
  });
}

export function useTaskActivity(id: string) {
  return useQuery<TaskActivityEntry[]>({
    queryKey: ["tasks", id, "activity"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}/activity`);
      if (!res.ok) throw new Error("Failed to load activity");
      return (await res.json()).activity;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const res = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create task");
      return json.task as TaskData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTaskInput) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update task");
      return json.task as TaskData;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["tasks", vars.id] });
      qc.invalidateQueries({ queryKey: ["tasks", vars.id, "activity"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete task");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Comments ───────────────────────────────────────────────────────────────

export function useAddTaskComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { content: string; parentId?: string; mentions?: string[] }) => {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add comment");
      return json.comment as TaskCommentData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", taskId] });
      qc.invalidateQueries({ queryKey: ["tasks", taskId, "activity"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Assignable employees ───────────────────────────────────────────────────

export function useAssignableEmployees() {
  return useQuery<AssignableEmployee[]>({
    queryKey: ["tasks", "assignees"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/assignees");
      if (!res.ok) throw new Error("Failed to load employees");
      return (await res.json()).employees;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Analytics (admin) ───────────────────────────────────────────────────────

export function useTaskAnalytics() {
  return useQuery<TaskAnalytics>({
    queryKey: ["tasks", "analytics"],
    queryFn: async () => {
      const res = await fetch("/api/tasks/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
