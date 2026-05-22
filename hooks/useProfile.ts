"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Profile ─────────────────────────────────────────────────────────────────

export function useProfile(employeeId: string) {
  return useQuery({
    queryKey: ["profile", employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${employeeId}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      const json = await res.json();
      return json.profile;
    },
    enabled: !!employeeId,
  });
}

export function useUpdateProfile(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/profile/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      return json.profile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", employeeId] });
      toast.success("Profile updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

export function useUploadAvatar(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/profile/${employeeId}/avatar`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      return json.profile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", employeeId] });
      toast.success("Profile photo updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAvatar(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/profile/${employeeId}/avatar`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", employeeId] });
      toast.success("Photo removed.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ─── Documents ────────────────────────────────────────────────────────────────

export function useProfileDocuments(employeeId: string) {
  return useQuery({
    queryKey: ["profile-documents", employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${employeeId}/documents`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      const json = await res.json();
      return json.documents ?? [];
    },
    enabled: !!employeeId,
  });
}

// Keep old export name for backward compat
export const useDocuments = useProfileDocuments;

export function useUploadDocument(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { file: File; documentName: string; documentType: string }) => {
      const form = new FormData();
      form.append("file", data.file);
      form.append("documentName", data.documentName);
      form.append("documentType", data.documentType);
      const res = await fetch(`/api/profile/${employeeId}/documents`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      return json.document;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-documents", employeeId] });
      toast.success("Document uploaded.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDocument(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/profile/${employeeId}/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Delete failed"); }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-documents", employeeId] });
      toast.success("Document deleted.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useVerifyDocument(employeeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { docId: string; status: "verified" | "rejected"; rejectionReason?: string }) => {
      const res = await fetch(`/api/profile/${employeeId}/documents/${data.docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: data.status, rejectionReason: data.rejectionReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      return json.document;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile-documents", employeeId] });
      toast.success("Document status updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
