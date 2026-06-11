export const APPROVAL_STATUSES = [
  "PENDING_INVITATION",
  "INVITED",
  "PROFILE_IN_PROGRESS",
  "PROFILE_SUBMITTED",
  "REJECTED",
  "ACTIVE",
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

/**
 * Legacy employees created before the onboarding workflow have no
 * `approvalStatus` set — treat them as fully active.
 */
export function getApprovalStatus(approvalStatus?: string | null): ApprovalStatus {
  if (approvalStatus && (APPROVAL_STATUSES as readonly string[]).includes(approvalStatus)) {
    return approvalStatus as ApprovalStatus;
  }
  return "ACTIVE";
}

/**
 * Derives a placeholder display name from an email address, e.g.
 * "john.doe@example.com" -> "John Doe". The employee replaces this
 * with their real name during onboarding.
 */
export function derivePlaceholderName(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const words = localPart
    .split(/[._-]+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  if (words.length === 0) return "New Employee";
  return words.join(" ");
}

export function getApprovalStatusBadge(status?: string | null): { label: string; className: string } {
  const map: Record<ApprovalStatus, { label: string; className: string }> = {
    PENDING_INVITATION: { label: "Pending Invitation", className: "bg-slate-100 text-slate-600" },
    INVITED: { label: "Invited", className: "bg-sky-100 text-sky-700" },
    PROFILE_IN_PROGRESS: { label: "In Progress", className: "bg-amber-100 text-amber-700" },
    PROFILE_SUBMITTED: { label: "Pending Review", className: "bg-violet-100 text-violet-700" },
    REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700" },
    ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  };
  return map[getApprovalStatus(status)];
}
