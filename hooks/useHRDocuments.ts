"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface HRDocumentData {
  id: string;
  title: string;
  description: string | null;
  category: string;
  fileName: string;
  fileType: string;
  isPublic: boolean;
  uploadedById: string;
  createdAt: string;
  fileBase64?: string; // only fetched on single-doc request
}

export function useHRDocuments(filters?: { search?: string; category?: string }) {
  const p = new URLSearchParams();
  if (filters?.search)   p.set("search",   filters.search);
  if (filters?.category) p.set("category", filters.category);

  return useQuery<HRDocumentData[]>({
    queryKey: ["hr-documents", filters],
    queryFn: async () => {
      const res = await fetch(`/api/hr-documents?${p.toString()}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).documents;
    },
  });
}

export function useHRDocument(id: string) {
  return useQuery<HRDocumentData>({
    queryKey: ["hr-documents", id],
    queryFn: async () => {
      const res = await fetch(`/api/hr-documents/${id}`);
      if (!res.ok) throw new Error("Failed");
      return (await res.json()).document;
    },
    enabled: !!id,
  });
}

export function useUploadHRDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { file: File; title: string; category?: string; description?: string; isPublic?: boolean }) => {
      const form = new FormData();
      form.append("file",        data.file);
      form.append("title",       data.title);
      if (data.category)    form.append("category",    data.category);
      if (data.description) form.append("description", data.description);
      form.append("isPublic", String(data.isPublic ?? true));

      const res = await fetch("/api/hr-documents", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      return json.document as HRDocumentData;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-documents"] }); toast.success("Document uploaded."); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteHRDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hr-documents/${id}`, { method: "DELETE" });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hr-documents"] }); toast.success("Document deleted."); },
    onError: (e: Error) => toast.error(e.message),
  });
}
