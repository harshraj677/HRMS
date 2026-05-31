import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { fireAttendanceAudit } from "@/lib/attendanceAudit";

/**
 * POST /api/attendance/purge-media
 * Nulls out photos and location data for attendance records older than the
 * configured retention days.  Admin-only.  Creates an audit entry per purged record.
 *
 * Body: { dryRun?: boolean }  — when true, returns count without mutating.
 */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;

  // Load retention settings
  const settingsRec = await prisma.settings.findUnique({ where: { key: "attendance_retention" } });
  const settings = (settingsRec?.value as { photoRetentionDays?: number; locationRetentionDays?: number } | null) ?? {};
  const photoRetentionDays = settings.photoRetentionDays ?? 90;
  const locationRetentionDays = settings.locationRetentionDays ?? 365;

  const now = new Date();
  const photoCutoff = new Date(now.getTime() - photoRetentionDays * 86400_000);
  const locationCutoff = new Date(now.getTime() - locationRetentionDays * 86400_000);

  // Find records eligible for photo purge
  const toPhotoPurge = await prisma.attendance.findMany({
    where: {
      date: { lt: photoCutoff },
      OR: [
        { checkInPhoto: { not: null } },
        { checkOutPhoto: { not: null } },
      ],
    },
    select: { id: true },
  });

  // Find records eligible for location purge
  const toLocationPurge = await prisma.attendance.findMany({
    where: {
      date: { lt: locationCutoff },
      OR: [{ latitude: { not: null } }, { longitude: { not: null } }],
    },
    select: { id: true },
  });

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      photoPurgeCount: toPhotoPurge.length,
      locationPurgeCount: toLocationPurge.length,
      photoRetentionDays,
      locationRetentionDays,
    });
  }

  // Purge photos
  if (toPhotoPurge.length) {
    await prisma.attendance.updateMany({
      where: { id: { in: toPhotoPurge.map((r) => r.id) } },
      data: { checkInPhoto: null, checkOutPhoto: null },
    });
    for (const r of toPhotoPurge) {
      fireAttendanceAudit({
        attendanceId: r.id,
        actorId: payload.id,
        action: "purged",
        reason: `Photo purged after ${photoRetentionDays}-day retention policy`,
        metadata: { type: "photo", cutoff: photoCutoff.toISOString() },
      });
    }
  }

  // Purge location
  if (toLocationPurge.length) {
    await prisma.attendance.updateMany({
      where: { id: { in: toLocationPurge.map((r) => r.id) } },
      data: { latitude: null, longitude: null, ipAddress: null },
    });
    for (const r of toLocationPurge) {
      fireAttendanceAudit({
        attendanceId: r.id,
        actorId: payload.id,
        action: "purged",
        reason: `Location purged after ${locationRetentionDays}-day retention policy`,
        metadata: { type: "location", cutoff: locationCutoff.toISOString() },
      });
    }
  }

  return NextResponse.json({
    photoPurged: toPhotoPurge.length,
    locationPurged: toLocationPurge.length,
    message: `Purged ${toPhotoPurge.length} photo(s) and ${toLocationPurge.length} location record(s).`,
  });
}
