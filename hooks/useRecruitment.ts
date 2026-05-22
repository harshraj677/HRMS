"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface JobData {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  experience: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  employmentType: string;
  skills: string[];
  description: string;
  status: string;
  deadline: string | null;
  createdAt: string;
}

export interface CandidateData {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  appliedJobId: string | null;
  stage: string;
  notes: string | null;
  referredById: string | null;
  interviewDate: string | null;
  interviewNotes: string | null;
  createdAt: string;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export function useJobs(filters?: { status?: string; department?: string }) {
  const p = new URLSearchParams();
  if (filters?.status)     p.set("status",     filters.status);
  if (filters?.department) p.set("department", filters.department);

  return useQuery<JobData[]>({
    queryKey: ["jobs", filters],
    queryFn: async () => {
      const res = await fetch(`/api/recruitment/jobs?${p.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).jobs;
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<JobData>) => {
      const res = await fetch("/api/recruitment/jobs", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.job as JobData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast.success("Job posted."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<JobData> & { id: string }) => {
      const res = await fetch(`/api/recruitment/jobs/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.job as JobData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast.success("Job updated."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recruitment/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["jobs"] }); toast.success("Job deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Candidates ───────────────────────────────────────────────────────────────

export function useCandidates(filters?: { jobId?: string; stage?: string }) {
  const p = new URLSearchParams();
  if (filters?.jobId) p.set("jobId", filters.jobId);
  if (filters?.stage) p.set("stage", filters.stage);

  return useQuery<CandidateData[]>({
    queryKey: ["candidates", filters],
    queryFn: async () => {
      const res = await fetch(`/api/recruitment/candidates?${p.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).candidates;
    },
  });
}

export function useSubmitCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<CandidateData> & { resumeBase64?: string }) => {
      const res = await fetch("/api/recruitment/candidates", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.candidate as CandidateData;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast.success("Candidate submitted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CandidateData> & { id: string }) => {
      const res = await fetch(`/api/recruitment/candidates/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.candidate as CandidateData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidates"] }); toast.success("Candidate updated."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recruitment/candidates/${id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["candidates"] }); toast.success("Candidate removed."); },
    onError: (e: Error) => toast.error(e.message),
  });
}
