import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const todayDate = new Date(
    new Date().toISOString().slice(0, 10) + "T00:00:00.000Z"
  );

  const record = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: payload.id, date: todayDate } },
  });

  if (!record) {
    return NextResponse.json({
      checkIn: null,
      checkOut: null,
      hours: null,
      status: "not-checked-in",
      distanceFromOffice: null,
    });
  }

  let currentStatus = record.status || "not-checked-in";
  if (!record.status) {
    if (record.checkIn && !record.checkOut) currentStatus = "present";
    else if (record.checkIn && record.checkOut) currentStatus = "completed";
  }

  let hours = record.hours;
  if (record.checkIn && !record.checkOut) {
    hours = parseFloat(
      ((Date.now() - record.checkIn.getTime()) / (1000 * 60 * 60)).toFixed(1)
    );
  }

  const res = NextResponse.json({
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    hours,
    status: currentStatus,
    distanceFromOffice: record.distanceFromOffice,
    latitude: record.latitude ?? null,
    longitude: record.longitude ?? null,
    checkInAddress: record.checkInAddress ?? null,
    checkOutAddress: record.checkOutAddress ?? null,
    checkInPhoto: record.checkInPhoto ?? null,
    checkOutPhoto: record.checkOutPhoto ?? null,
    faceVerified: record.faceVerified ?? null,
    faceScore: record.faceScore ?? null,
    needsReview: record.needsReview,
    policyResult: record.policyResult ?? null,
    isRemote: record.isRemote,
    manualOverride: record.manualOverride,
    livenessResult: record.livenessResult ?? null,
    livenessScore: record.livenessScore ?? null,
    reviewStatus: record.reviewStatus,
    reviewNotes: record.reviewNotes ?? null,
  });
  // Revalidate every 30 s — attendance data changes when employee checks in/out
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=120");
  return res;
}
