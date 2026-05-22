"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface CourseData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  level: string;
  durationMins: number | null;
  isRequired: boolean;
  createdAt: string;
  enrolledCount: number;
  myProgress: number | null;
  myCompleted: boolean;
  isEnrolled: boolean;
}

export function useCourses() {
  return useQuery<CourseData[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses");
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).courses;
    },
  });
}

export function useCreateCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CourseData> & { content?: string }) => {
      const res = await fetch("/api/courses", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.course as CourseData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courses"] }); toast.success("Course created."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useEnrollCourse(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/enroll`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["courses"] }); toast.success("Enrolled!"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProgress(courseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (progress: number) => {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}
