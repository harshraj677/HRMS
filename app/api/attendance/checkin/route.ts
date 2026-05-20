import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { isWithinGeofence, getAttendanceStatus, OFFICE_LOCATION } from "@/lib/geofence";

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

  // CHECK 3 — GPS distance / geofence (using DB office location)
  const geoCheck = isWithinGeofence(
    latitude,
    longitude,
    officeSettings.latitude,
    officeSettings.longitude,
    officeSettings.radiusMeters
  );

  if (!geoCheck.allowed) {
    await prisma.suspiciousLog.create({
      data: {
        employeeId: payload.id,
        type: "geofence_violation",
        description: `Attempted check-in from ${geoCheck.distance}m away from office (limit: ${officeSettings.radiusMeters}m). Lat: ${latitude}, Lng: ${longitude}`,
        ipAddress: getClientIP(req),
      },
    });
    return NextResponse.json(
      {
        error: `Check-in failed: You must be within ${officeSettings.radiusMeters} meters of the office to check in.`,
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

  const ipAddress = clientIp;
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
