"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface OnboardingProfile {
  id: string;
  employeeId: string;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  alternatePhone: string | null;
  emergencyName: string | null;
  emergencyRelation: string | null;
  emergencyPhone: string | null;
  emergencyEmail: string | null;
  highestEducation: string | null;
  institution: string | null;
  fieldOfStudy: string | null;
  graduationYear: number | null;
  skills: string[];
  certifications: string[];
  experience: string | null;
  bio: string | null;
  avatar: string | null;
  employeeType: string | null;
  joiningDate: string | null;
  reportingManager: string | null;
  workLocation: string | null;
  shiftTiming: string | null;
  employmentStatus: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  bankIFSC: string | null;
  bankName: string | null;
  onboardingCompleted: boolean;
}

export interface OnboardingDocument {
  id: string;
  employeeId: string;
  documentName: string;
  documentType: string;
  documentUrl: string;
  verificationStatus: string;
  rejectionReason: string | null;
  uploadedAt: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

export interface OnboardingEmployee {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
  department: string | null;
  approvalStatus: string | null;
  approvalDate: string | null;
  approvedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  profile: OnboardingProfile | null;
  documents: OnboardingDocument[];
}

export interface OnboardingStats {
  pendingInvitations: number;
  pendingReviews: number;
  approved: number;
  rejected: number;
  recentlyJoined: number;
}

export interface OnboardingQueueResponse {
  employees: OnboardingEmployee[];
  stats: OnboardingStats;
}

export function useOnboardingQueue() {
  return useQuery<OnboardingQueueResponse>({
    queryKey: ["onboarding"],
    queryFn: async () => {
      const res = await fetch("/api/onboarding");
      if (!res.ok) throw new Error("Failed to fetch onboarding queue");
      return res.json();
    },
  });
}

export function useApproveProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/onboarding/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to approve profile");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Profile approved.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRejectProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/onboarding/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to reject profile");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      qc.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Profile sent back for corrections.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSubmitOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/onboarding/submit", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit profile");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
