import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { isWithinGeofence, getAttendanceStatus, OFFICE_LOCATION } from "@/lib/geofence";
import { evaluatePolicy } from "@/lib/policyEngine";
import { getDefaultLivenessAdapter, shouldBlockOnLiveness, shouldFlagLiveness } from "@/lib/livenessAdapter";
import type { LivenessClientEvidence, LivenessEnforcement, LivenessResult } from "@/lib/livenessAdapter";
import { fireAttendanceAudit } from "@/lib/attendanceAudit";
import { reverseGeocode } from "@/lib/geocode";

const DEFAULT_OFFICE = {
  wifiName: "",
  officeIp: "",
  latitude: OFFICE_LOCATION.latitude,
  longitude: OFFICE_LOCATION.longitude,
  radiusMeters: OFFICE_LOCATION.radiusMeters,
};

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);

  const latitude = body?.latitude != null ? Number(body.latitude) : null;
  const longitude = body?.longitude != null ? Number(body.longitude) : null;
  const accuracy = body?.accuracy != null ? Number(body.accuracy) : null;
  const photo = typeof body?.photo === "string" && body.photo.length > 0 ? body.photo : null;
  const overrideRequested = body?.overrideRequested === true;
  const overrideNote = typeof body?.overrideNote === "string" ? body.overrideNote.trim() : null;

  // Phase 4 — liveness evidence from client
  const rawLiveness = body?.livenessEvidence ?? null;
  const livenessEvidence: LivenessClientEvidence | null =
    rawLiveness &&
    typeof rawLiveness.frameCount === "number" &&
    typeof rawLiveness.maxFrameDiff === "number" &&
    Array.isArray(rawLiveness.diffs)
      ? (rawLiveness as LivenessClientEvidence)
      : null;

  // Face verification result from client — stored as evidence but never blocks or flags check-in
  // Proof-only mode: the geotagged selfie is sufficient proof; face-match is advisory only.
  const faceV = body?.faceVerification ?? null;
  const faceScore: number | null = typeof faceV?.confidence === "number" ? faceV.confidence : null;
  const faceVerified: boolean | null = typeof faceV?.verified === "boolean" ? faceV.verified : null;
  const faceMethod: string | null = typeof faceV?.method === "string" ? faceV.method : null;
  // Face mismatch no longer triggers needsReview — only policy violations and liveness do
  const needsReview = false;

  if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: "Location data is required. Please enable location services." },
      { status: 400 }
    );
  }

  // CHECK 1 — Mock location detection
  if (body?.mocked === true) {
    await prisma.suspiciousLog.create({
      data: {
        employeeId: payload.id,
        type: "mock_location_detected",
        description: `Check-in blocked: Fake GPS app detected. Lat: ${latitude}, Lng: ${longitude}`,
        ipAddress: getClientIP(req),
      },
    });
    return NextResponse.json(
      { error: "Check-in blocked: Fake GPS detected on your device." },
      { status: 403 }
    );
  }

  // Fetch office settings from DB (fallback to defaults if not configured)
  const settingsRecord = await prisma.settings.findUnique({ where: { key: "office" } });
  const officeSettings = (settingsRecord?.value as typeof DEFAULT_OFFICE) ?? DEFAULT_OFFICE;

  // CHECK 2 — Office WiFi verification via public IP
  // Browsers cannot read WiFi SSID, so we compare the client's public IP against the
  // office IP registered by the admin while on office WiFi. All devices on the same
  // WiFi share the same public IP (NAT), making this a reliable network check.
  const clientIp = getClientIP(req);
  if (officeSettings.wifiName && officeSettings.officeIp) {
    if (clientIp !== officeSettings.officeIp) {
      await prisma.suspiciousLog.create({
        data: {
          employeeId: payload.id,
          type: "wifi_mismatch",
          description: `Check-in blocked: Network IP "${clientIp}" does not match office WiFi IP "${officeSettings.officeIp}" (WiFi: ${officeSettings.wifiName}).`,
          ipAddress: clientIp,
        },
      });
      return NextResponse.json(
        { error: "Check-in blocked: You must be connected to the office WiFi." },
        { status: 403 }
      );
    }
  }

  // CHECK 3 — Policy engine (Phase 3) or legacy single-circle office zone check (fallback)
  const policyEval = await evaluatePolicy({
    latitude,
    longitude,
    faceVerified,
    faceScore,
    overrideRequested,
  });

  // Legacy office-zone distance (always computed for distanceFromOffice column)
  const legacyGeo = isWithinGeofence(
    latitude, longitude,
    officeSettings.latitude, officeSettings.longitude,
    officeSettings.radiusMeters
  );

  if (policyEval.status === "blocked") {
    await prisma.suspiciousLog.create({
      data: {
        employeeId: payload.id,
        type: "policy_block",
        description: `Check-in blocked by policy "${policyEval.policyName ?? "default"}": ${policyEval.blockReason}`,
        ipAddress: getClientIP(req),
      },
    });
    return NextResponse.json(
      {
        error: policyEval.blockReason ?? "Check-in blocked by attendance policy.",
        policyResult: policyEval,
        overrideAllowed: policyEval.manualOverrideAllowed,
      },
      { status: 403 }
    );
  }

  // If Phase 3 is disabled (policyEval returns legacy "ok") still enforce the old hard circle
  if (policyEval.enforcementMode === "legacy" && !legacyGeo.allowed) {
    await prisma.suspiciousLog.create({
      data: {
        employeeId: payload.id,
        type: "office_zone_violation",
        description: `Attempted check-in from ${legacyGeo.distance}m away from office (limit: ${officeSettings.radiusMeters}m).`,
        ipAddress: getClientIP(req),
      },
    });
    return NextResponse.json(
      {
        error: `Check-in failed: You must be within ${officeSettings.radiusMeters} meters of the office to check in.`,
        distance: legacyGeo.distance,
      },
      { status: 403 }
    );
  }

  // ── Phase 4: liveness evaluation ─────────────────────────────────────────
  const livenessEnforcementRec = await prisma.settings.findUnique({ where: { key: "liveness_enforcement" } });
  const livenessEnforcement: LivenessEnforcement =
    ((livenessEnforcementRec?.value as { level?: string } | null)?.level as LivenessEnforcement) ?? "off";

  let livenessResult: LivenessResult = { result: "unknown", score: 0, method: "none", reason: "No evidence provided" };
  if (livenessEvidence) {
    livenessResult = await getDefaultLivenessAdapter().verify(livenessEvidence);
  }

  if (shouldBlockOnLiveness(livenessResult, livenessEnforcement)) {
    await prisma.suspiciousLog.create({
      data: {
        employeeId: payload.id,
        type: "liveness_failed",
        description: `Liveness check blocked check-in: ${livenessResult.reason ?? "score too low"} (score ${livenessResult.score})`,
        ipAddress: getClientIP(req),
      },
    });
    return NextResponse.json(
      {
        error: `Liveness check failed: ${livenessResult.reason ?? "Please try again and blink naturally during the countdown."}`,
        livenessResult,
        livenessRetryAllowed: true,
      },
      { status: 403 }
    );
  }

  const now = new Date();
  const todayDate = new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: payload.id, date: todayDate } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already checked in today.", checkIn: existing.checkIn },
      { status: 400 }
    );
  }

  const ipAddress = clientIp;
  const device = req.headers.get("user-agent") || null;
  const status = getAttendanceStatus(now);

  const livenessFlagged = shouldFlagLiveness(livenessResult, livenessEnforcement);
  const combinedNeedsReview = needsReview || policyEval.addNeedsReview || livenessFlagged;
  const reviewStatus = combinedNeedsReview ? "flagged" : "auto";

  const created = await prisma.attendance.create({
    data: {
      employeeId: payload.id,
      date: todayDate,
      checkIn: now,
      status,
      latitude,
      longitude,
      ipAddress,
      device,
      distanceFromOffice: policyEval.distanceMeters ?? legacyGeo.distance,
      checkInPhoto: photo,
      checkInAccuracy: accuracy,
      faceScore,
      faceVerified,
      faceVerifiedAt: faceV ? new Date() : null,
      faceVerificationMethod: faceMethod,
      needsReview: combinedNeedsReview,
      // Phase 3 policy fields
      policyId: policyEval.policyId,
      policyResult: {
        status: policyEval.status,
        distanceMeters: policyEval.distanceMeters,
        isRemote: policyEval.isRemote,
        policyName: policyEval.policyName,
        enforcementMode: policyEval.enforcementMode,
        message: policyEval.message,
      },
      policyEvaluatedAt: new Date(),
      isRemote: policyEval.isRemote,
      manualOverride: overrideRequested && policyEval.manualOverrideAllowed,
      overrideNote: overrideRequested ? overrideNote : null,
      // Phase 5 review
      reviewStatus,
      // Phase 4 liveness
      livenessResult: livenessEvidence ? livenessResult.result : null,
      livenessScore: livenessEvidence ? livenessResult.score : null,
      livenessMethod: livenessEvidence ? livenessResult.method : null,
      livenessCheckedAt: livenessEvidence ? new Date() : null,
      livenessChallengeType: livenessEvidence?.challengeType ?? null,
      livenessFrameCount: livenessEvidence?.frameCount ?? null,
      livenessMaxDiff: livenessEvidence?.maxFrameDiff ?? null,
      livenessAvgDiff: livenessEvidence?.avgFrameDiff ?? null,
    },
    select: { id: true },
  });

  // Fire-and-forget reverse geocoding — saves address without blocking response
  void reverseGeocode(latitude, longitude).then((address) =>
    prisma.attendance.update({ where: { id: created.id }, data: { checkInAddress: address } }).catch(() => {})
  );

  // Fire-and-forget attendance audit entry (Phase 5)
  fireAttendanceAudit({
    attendanceId: created.id,
    actorId: payload.id,
    action: combinedNeedsReview ? "flagged" : "created",
    metadata: {
      faceScore,
      faceVerified,
      livenessResult: livenessResult.result,
      livenessScore: livenessResult.score,
      policyStatus: policyEval.status,
      reviewStatus,
    },
  });

  return NextResponse.json(
    {
      message: policyEval.message || "Checked in successfully.",
      checkIn: now.toISOString(),
      status,
      distance: policyEval.distanceMeters ?? legacyGeo.distance,
      policyResult: {
        status: policyEval.status,
        isRemote: policyEval.isRemote,
        message: policyEval.message,
      },
    },
    { status: 201 }
  );
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
