/**
 * Phase 3 — Attendance policy evaluation engine.
 *
 * Evaluation order:
 *  1. Check feature flag ("phase3_policy" in Settings). If disabled → legacy "ok".
 *  2. Find the active default AttendancePolicy. If none → legacy "ok".
 *  3. Test point against each allowed Geofence (circle: Haversine, polygon: ray-casting).
 *  4. If inside any geofence → status "ok".
 *  5. If remoteWorkAllowed → status "remote_ok", isRemote = true.
 *  6. enforcementMode "soft"           → status "outside" (allow, warn).
 *  7. enforcementMode "allow-if-matched"→ status "outside" (allow, flag).
 *  8. enforcementMode "hard"           → status "blocked" (reject unless overrideRequested).
 *  9. If faceVerifyRequired and faceVerified !== true → adds "review" flag.
 */

import { prisma } from "@/lib/db";
import { haversineDistance } from "@/lib/geofence";
import { pointInPolygon, polygonCentroid, type GeoPoint } from "@/lib/polygonContainment";

// ── Types ──────────────────────────────────────────────────────────────────

export type PolicyStatus = "ok" | "remote_ok" | "outside" | "blocked" | "review";

export interface PolicyResult {
  status: PolicyStatus;
  policyId: string | null;
  policyName: string | null;
  geofenceId: string | null;
  geofenceName: string | null;
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

// ── Geometry helpers ───────────────────────────────────────────────────────

type CircleGeom = { type: "circle"; lat: number; lng: number; radiusMeters: number };
type PolygonGeom = { type: "polygon"; coordinates: GeoPoint[] };
type GeomJson = CircleGeom | PolygonGeom;

function testGeofence(
  point: GeoPoint,
  geom: GeomJson
): { inside: boolean; distanceMeters: number | null } {
  if (geom.type === "circle") {
    const dist = Math.round(haversineDistance(point.lat, point.lng, geom.lat, geom.lng));
    return { inside: dist <= geom.radiusMeters, distanceMeters: dist };
  }
  // polygon
  const inside = pointInPolygon(point, geom.coordinates);
  if (inside) return { inside: true, distanceMeters: 0 };
  const centroid = polygonCentroid(geom.coordinates);
  const dist = Math.round(haversineDistance(point.lat, point.lng, centroid.lat, centroid.lng));
  return { inside: false, distanceMeters: dist };
}

// ── Main evaluation ────────────────────────────────────────────────────────

export async function evaluatePolicy(input: EvalInput): Promise<PolicyResult> {
  // 1. Feature flag
  const flagRec = await prisma.settings.findUnique({ where: { key: "phase3_policy" } });
  const enabled = (flagRec?.value as { enabled?: boolean } | null)?.enabled === true;
  if (!enabled) {
    return ok(null, null, null, null, null, false, "legacy", "Policy engine disabled (Phase 3 off)");
  }

  // 2. Active default policy
  const policy = await prisma.attendancePolicy.findFirst({
    where: { active: true, isDefault: true },
    orderBy: { createdAt: "desc" },
  });
  if (!policy) {
    return ok(null, null, null, null, null, false, "none", "No policy configured");
  }

  const point: GeoPoint = { lat: input.latitude, lng: input.longitude };

  // 3. Check geofences
  let matched: { id: string; name: string; dist: number | null } | null = null;
  let closestDist: number | null = null;
  let closestId: string | null = null;
  let closestName: string | null = null;

  if (policy.allowedGeofenceIds.length > 0) {
    const gfDocs = await prisma.geofence.findMany({
      where: { id: { in: policy.allowedGeofenceIds }, active: true },
    });
    for (const gf of gfDocs) {
      const geom = gf.geometry as GeomJson;
      const { inside, distanceMeters } = testGeofence(point, geom);
      // Track closest geofence for reporting
      if (distanceMeters !== null && (closestDist === null || distanceMeters < closestDist)) {
        closestDist = distanceMeters;
        closestId = gf.id;
        closestName = gf.name;
      }
      if (inside) {
        matched = { id: gf.id, name: gf.name, dist: distanceMeters };
        break;
      }
    }
  }

  // 4. Inside geofence → always OK
  if (matched) {
    const needsReviewFace =
      policy.faceVerifyRequired && input.faceVerified !== true;
    return {
      status: needsReviewFace ? "review" : "ok",
      policyId: policy.id,
      policyName: policy.name,
      geofenceId: matched.id,
      geofenceName: matched.name,
      distanceMeters: matched.dist,
      isRemote: false,
      manualOverrideAllowed: policy.manualOverrideAllowed,
      enforcementMode: policy.enforcementMode,
      message: needsReviewFace
        ? `Checked in from ${matched.name} — face verification required`
        : `Within ${matched.name}`,
      blockReason: null,
      addNeedsReview: needsReviewFace,
    };
  }

  // 5. allowedDistanceMeters buffer
  if (policy.allowedDistanceMeters !== null && policy.allowedDistanceMeters !== undefined) {
    if (closestDist !== null && closestDist <= policy.allowedDistanceMeters) {
      return ok(policy.id, policy.name, closestId, closestName, closestDist, false,
        policy.enforcementMode, `Within ${closestDist}m buffer of ${closestName ?? "allowed zone"}`);
    }
  }

  // 6. Remote work
  if (policy.remoteWorkAllowed) {
    return {
      status: "remote_ok",
      policyId: policy.id,
      policyName: policy.name,
      geofenceId: null,
      geofenceName: null,
      distanceMeters: closestDist,
      isRemote: true,
      manualOverrideAllowed: policy.manualOverrideAllowed,
      enforcementMode: policy.enforcementMode,
      message: "Remote work — location logged",
      blockReason: null,
      addNeedsReview: policy.faceVerifyRequired && input.faceVerified !== true,
    };
  }

  // 7. Outside all geofences — apply enforcement mode
  const distText = closestDist !== null ? `${closestDist}m from nearest zone` : "location not in any allowed area";

  if (policy.enforcementMode === "hard") {
    // Allow if employee explicitly requested override
    if (input.overrideRequested && policy.manualOverrideAllowed) {
      return {
        status: "outside",
        policyId: policy.id,
        policyName: policy.name,
        geofenceId: closestId,
        geofenceName: closestName,
        distanceMeters: closestDist,
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
      geofenceId: closestId,
      geofenceName: closestName,
      distanceMeters: closestDist,
      isRemote: false,
      manualOverrideAllowed: policy.manualOverrideAllowed,
      enforcementMode: "hard",
      message: `Check-in blocked: ${distText}`,
      blockReason: `You must be within an allowed location to check in. You are ${distText}.${policy.manualOverrideAllowed ? " Use 'Request Override' to proceed for review." : ""}`,
      addNeedsReview: false,
    };
  }

  // soft / allow-if-matched → allow with flag
  return {
    status: "outside",
    policyId: policy.id,
    policyName: policy.name,
    geofenceId: closestId,
    geofenceName: closestName,
    distanceMeters: closestDist,
    isRemote: false,
    manualOverrideAllowed: policy.manualOverrideAllowed,
    enforcementMode: policy.enforcementMode,
    message: `Outside allowed area (${distText}) — check-in recorded with location flag`,
    blockReason: null,
    addNeedsReview: true,
  };
}

function ok(
  policyId: string | null,
  policyName: string | null,
  geofenceId: string | null,
  geofenceName: string | null,
  distanceMeters: number | null,
  isRemote: boolean,
  enforcementMode: string,
  message: string
): PolicyResult {
  return {
    status: "ok",
    policyId,
    policyName,
    geofenceId,
    geofenceName,
    distanceMeters,
    isRemote,
    manualOverrideAllowed: false,
    enforcementMode,
    message,
    blockReason: null,
    addNeedsReview: false,
  };
}
