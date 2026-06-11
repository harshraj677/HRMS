/**
 * Phase 3 — Attendance policy evaluation engine.
 *
 * Evaluation order:
 *  1. Check feature flag ("phase3_policy" in Settings). If disabled → legacy "ok".
 *  2. Find the active default AttendancePolicy. If none → legacy "ok".
 *  3. Test the check-in point against the configured office zone (Settings "office",
 *     falling back to OFFICE_LOCATION), plus the policy's optional distance buffer.
 *  4. If inside the office zone (or buffer) → status "ok".
 *  5. If remoteWorkAllowed → status "remote_ok", isRemote = true.
 *  6. enforcementMode "soft"           → status "outside" (allow, warn).
 *  7. enforcementMode "allow-if-matched"→ status "outside" (allow, flag).
 *  8. enforcementMode "hard"           → status "blocked" (reject unless overrideRequested).
 *  9. If faceVerifyRequired and faceVerified !== true → adds "review" flag.
 */

import { prisma } from "@/lib/db";
import { isWithinGeofence, OFFICE_LOCATION } from "@/lib/geofence";

// ── Types ──────────────────────────────────────────────────────────────────

export type PolicyStatus = "ok" | "remote_ok" | "outside" | "blocked" | "review";

export interface PolicyResult {
  status: PolicyStatus;
  policyId: string | null;
  policyName: string | null;
  distanceMeters: number | null;
  isRemote: boolean;
  manualOverrideAllowed: boolean;
  enforcementMode: string;
  message: string;
  blockReason: string | null;
  addNeedsReview: boolean;
}

export interface EvalInput {
  latitude: number;
  longitude: number;
  faceVerified?: boolean | null;
  faceScore?: number | null;
  /** Pass true when the employee explicitly requests a manual override. */
  overrideRequested?: boolean;
}

// ── Main evaluation ────────────────────────────────────────────────────────

export async function evaluatePolicy(input: EvalInput): Promise<PolicyResult> {
  // 1. Feature flag
  const flagRec = await prisma.settings.findUnique({ where: { key: "phase3_policy" } });
  const enabled = (flagRec?.value as { enabled?: boolean } | null)?.enabled === true;
  if (!enabled) {
    return ok(null, null, null, false, "legacy", "Policy engine disabled (Phase 3 off)");
  }

  // 2. Active default policy
  const policy = await prisma.attendancePolicy.findFirst({
    where: { active: true, isDefault: true },
    orderBy: { createdAt: "desc" },
  });
  if (!policy) {
    return ok(null, null, null, false, "none", "No policy configured");
  }

  // 3. Office zone check
  const officeRec = await prisma.settings.findUnique({ where: { key: "office" } });
  const office = (officeRec?.value as { latitude?: number; longitude?: number; radiusMeters?: number } | null) ?? {};
  const officeLat = office.latitude ?? OFFICE_LOCATION.latitude;
  const officeLng = office.longitude ?? OFFICE_LOCATION.longitude;
  const officeRadius = office.radiusMeters ?? OFFICE_LOCATION.radiusMeters;

  const buffer = policy.allowedDistanceMeters ?? 0;
  const { distance } = isWithinGeofence(input.latitude, input.longitude, officeLat, officeLng, officeRadius);
  const withinOfficeZone = distance <= officeRadius + buffer;

  // 4. Inside office zone → ok (or "review" if face verification required)
  if (withinOfficeZone) {
    const needsReviewFace = policy.faceVerifyRequired && input.faceVerified !== true;
    return {
      status: needsReviewFace ? "review" : "ok",
      policyId: policy.id,
      policyName: policy.name,
      distanceMeters: distance,
      isRemote: false,
      manualOverrideAllowed: policy.manualOverrideAllowed,
      enforcementMode: policy.enforcementMode,
      message: needsReviewFace
        ? "Checked in at office — face verification required"
        : "Within office zone",
      blockReason: null,
      addNeedsReview: needsReviewFace,
    };
  }

  // 5. Remote work
  if (policy.remoteWorkAllowed) {
    return {
      status: "remote_ok",
      policyId: policy.id,
      policyName: policy.name,
      distanceMeters: distance,
      isRemote: true,
      manualOverrideAllowed: policy.manualOverrideAllowed,
      enforcementMode: policy.enforcementMode,
      message: "Remote work — location logged",
      blockReason: null,
      addNeedsReview: policy.faceVerifyRequired && input.faceVerified !== true,
    };
  }

  // 6. Outside office zone — apply enforcement mode
  const distText = `${distance}m from office`;

  if (policy.enforcementMode === "hard") {
    // Allow if employee explicitly requested override
    if (input.overrideRequested && policy.manualOverrideAllowed) {
      return {
        status: "outside",
        policyId: policy.id,
        policyName: policy.name,
        distanceMeters: distance,
        isRemote: false,
        manualOverrideAllowed: true,
        enforcementMode: policy.enforcementMode,
        message: "Override requested — flagged for HR review",
        blockReason: null,
        addNeedsReview: true,
      };
    }
    return {
      status: "blocked",
      policyId: policy.id,
      policyName: policy.name,
      distanceMeters: distance,
      isRemote: false,
      manualOverrideAllowed: policy.manualOverrideAllowed,
      enforcementMode: "hard",
      message: `Check-in blocked: ${distText}`,
      blockReason: `You must be within the office zone to check in. You are ${distText}.${policy.manualOverrideAllowed ? " Use 'Request Override' to proceed for review." : ""}`,
      addNeedsReview: false,
    };
  }

  // soft / allow-if-matched → allow with flag
  return {
    status: "outside",
    policyId: policy.id,
    policyName: policy.name,
    distanceMeters: distance,
    isRemote: false,
    manualOverrideAllowed: policy.manualOverrideAllowed,
    enforcementMode: policy.enforcementMode,
    message: `Outside office zone (${distText}) — check-in recorded with location flag`,
    blockReason: null,
    addNeedsReview: true,
  };
}

function ok(
  policyId: string | null,
  policyName: string | null,
  distanceMeters: number | null,
  isRemote: boolean,
  enforcementMode: string,
  message: string
): PolicyResult {
  return {
    status: "ok",
    policyId,
    policyName,
    distanceMeters,
    isRemote,
    manualOverrideAllowed: false,
    enforcementMode,
    message,
    blockReason: null,
    addNeedsReview: false,
  };
}
