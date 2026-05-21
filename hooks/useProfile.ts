"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Get profile data
export const useProfile = (employeeId: string) => {
  return useQuery({
    queryKey: ["profile", employeeId],
    queryFn: async () => {
      const response = await api.get(`/api/profile/${employeeId}`);
      return response.data;
    },
    enabled: !!employeeId,
  });
};

// Update profile data
export const useUpdateProfile = (employeeId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.put(`/api/profile/${employeeId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", employeeId] });
    },
  });
};

// Upload avatar
export const useUploadAvatar = (employeeId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api.post(
        `/api/profile/${employeeId}/avatar`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", employeeId] });
    },
  });
};

// Delete avatar
export const useDeleteAvatar = (employeeId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/api/profile/${employeeId}/avatar`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", employeeId] });
    },
  });
};

// Get documents
export const useProfileDocuments = (employeeId: string) => {
  return useQuery({
    queryKey: ["profile-documents", employeeId],
    queryFn: async () => {
      const response = await api.get(`/api/profile/${employeeId}/documents`);
      return response.data;
    },
    enabled: !!employeeId,
  });
};

// Upload document
export const useUploadDocument = (employeeId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      file: File;
      documentName: string;
      documentType: string;
    }) => {
      const formData = new FormData();
      formData.append("file", data.file);
      formData.append("documentName", data.documentName);
      formData.append("documentType", data.documentType);

      const response = await api.post(
        `/api/profile/${employeeId}/documents`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["profile-documents", employeeId],
      });
    },
  });
};

// Delete document
export const useDeleteDocument = (employeeId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (docId: string) => {
      const response = await api.delete(
        `/api/profile/${employeeId}/documents/${docId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["profile-documents", employeeId],
      });
    },
  });
};

// Verify document (admin only)
export const useVerifyDocument = (employeeId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (docId: string) => {
      const response = await api.patch(
        `/api/profile/${employeeId}/documents/${docId}`,
        { verificationStatus: "verified" }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["profile-documents", employeeId],
      });
    },
  });
};
