import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { getDefaultLivenessAdapter, shouldFlagLiveness } from "@/lib/livenessAdapter";
import { reverseGeocode } from "@/lib/geocode";
import type { LivenessClientEvidence, LivenessEnforcement, LivenessResult } from "@/lib/livenessAdapter";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const photo = typeof body?.photo === "string" && body.photo.length > 0 ? body.photo : null;
  const accuracy = body?.accuracy != null ? Number(body.accuracy) : null;
  const checkOutLat = body?.latitude != null ? Number(body.latitude) : null;
  const checkOutLng = body?.longitude != null ? Number(body.longitude) : null;

  // Face verification result from client (for check-out selfie)
  const faceV = body?.faceVerification ?? null;
  const checkOutFaceScore: number | null = typeof faceV?.confidence === "number" ? faceV.confidence : null;
  const checkOutFaceVerified: boolean | null = typeof faceV?.verified === "boolean" ? faceV.verified : null;
  const checkOutNeedsReview: boolean = faceV?.needsReview === true;

  // Phase 4 — liveness evidence
  const rawLiveness = body?.livenessEvidence ?? null;
  const livenessEvidence: LivenessClientEvidence | null =
    rawLiveness && typeof rawLiveness.frameCount === "number" && Array.isArray(rawLiveness.diffs)
      ? (rawLiveness as LivenessClientEvidence)
      : null;

  const now = new Date();
  const todayDate = new Date(now.toISOString().slice(0, 10) + "T00:00:00.000Z");

  const record = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: payload.id, date: todayDate } },
  });

  if (!record) {
    return NextResponse.json({ error: "You haven't checked in today." }, { status: 400 });
  }
  if (record.checkOut) {
    return NextResponse.json(
      { error: "Already checked out today.", checkOut: record.checkOut },
      { status: 400 }
    );
  }

  const checkInTime = new Date(record.checkIn!);
  const hours = parseFloat(
    ((now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2)
  );

  // Evaluate liveness for check-out (advisory only unless enforcement is "hard")
  let coLivenessResult: LivenessResult = { result: "unknown", score: 0, method: "none" };
  if (livenessEvidence) {
    coLivenessResult = await getDefaultLivenessAdapter().verify(livenessEvidence);
  }
  const livenessEnforcementRec = await prisma.settings.findUnique({ where: { key: "liveness_enforcement" } });
  const livenessEnforcement: LivenessEnforcement =
    ((livenessEnforcementRec?.value as { level?: string } | null)?.level as LivenessEnforcement) ?? "off";
  const livenessFlagged = livenessEvidence ? shouldFlagLiveness(coLivenessResult, livenessEnforcement) : false;

  await prisma.attendance.update({
    where: { id: record.id },
    data: {
      checkOut: now,
      hours,
      checkOutPhoto: photo,
      checkOutAccuracy: accuracy,
      // Only overwrite face fields if a check-out face result was supplied
      ...(faceV ? {
        faceScore: checkOutFaceScore,
        faceVerified: checkOutFaceVerified,
        faceVerifiedAt: new Date(),
        needsReview: checkOutNeedsReview || livenessFlagged,
      } : { ...(livenessFlagged ? { needsReview: true } : {}) }),
      // Phase 4 liveness — overwrite with check-out evidence if provided
      ...(livenessEvidence ? {
        livenessResult: coLivenessResult.result,
        livenessScore: coLivenessResult.score,
        livenessMethod: coLivenessResult.method,
        livenessCheckedAt: new Date(),
        livenessChallengeType: livenessEvidence.challengeType,
        livenessFrameCount: livenessEvidence.frameCount,
        livenessMaxDiff: livenessEvidence.maxFrameDiff,
        livenessAvgDiff: livenessEvidence.avgFrameDiff,
      } : {}),
    },
  });

  // Fire-and-forget reverse geocoding for checkout address
  if (checkOutLat != null && checkOutLng != null) {
    void reverseGeocode(checkOutLat, checkOutLng).then((address) =>
      prisma.attendance.update({ where: { id: record.id }, data: { checkOutAddress: address } }).catch(() => {})
    );
  }

  return NextResponse.json({
    message: "Checked out successfully.",
    checkOut: now.toISOString(),
    hours,
  });
}
