import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { isWithinGeofence, getAttendanceStatus } from "@/lib/geofence";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);

  const latitude = body?.latitude != null ? Number(body.latitude) : null;
  const longitude = body?.longitude != null ? Number(body.longitude) : null;

  if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: "Location data is required. Please enable location services." },
      { status: 400 }
    );
  }

  const geoCheck = isWithinGeofence(latitude, longitude);
  if (!geoCheck.allowed) {
    await prisma.suspiciousLog.create({
      data: {
        employeeId: payload.id,
        type: "geofence_violation",
        description: `Attempted check-in from ${geoCheck.distance}m away from office (limit: 200m). Lat: ${latitude}, Lng: ${longitude}`,
        ipAddress: getClientIP(req),
      },
    });

    return NextResponse.json(
      {
        error: "You must be within the office premises to check in.",
        distance: geoCheck.distance,
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

  const ipAddress = getClientIP(req);
  const device = req.headers.get("user-agent") || null;
  const status = getAttendanceStatus(now);

  await prisma.attendance.create({
    data: {
      employeeId: payload.id,
      date: todayDate,
      checkIn: now,
      status,
      latitude,
      longitude,
      ipAddress,
      device,
      distanceFromOffice: geoCheck.distance,
    },
  });

  return NextResponse.json(
    {
      message: "Checked in successfully.",
      checkIn: now.toISOString(),
      status,
      distance: geoCheck.distance,
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
