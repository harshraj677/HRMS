import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { isWithinGeofence, getAttendanceStatus } from "@/lib/geofence";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/** POST /api/attendance/checkin — employee checks in for today with geofencing */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);

  // Extract geolocation data
  const latitude = body?.latitude != null ? Number(body.latitude) : null;
  const longitude = body?.longitude != null ? Number(body.longitude) : null;

  // Validate geofence
  if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: "Location data is required. Please enable location services." },
      { status: 400 }
    );
  }

  const geoCheck = isWithinGeofence(latitude, longitude);
  if (!geoCheck.allowed) {
    // Log suspicious activity
    await db.execute(
      "INSERT INTO SuspiciousLog (employeeId, type, description, ipAddress) VALUES (?, ?, ?, ?)",
      [
        payload.id,
        "geofence_violation",
        `Attempted check-in from ${geoCheck.distance}m away from office (limit: 200m). Lat: ${latitude}, Lng: ${longitude}`,
        getClientIP(req),
      ]
    );

    return NextResponse.json(
      {
        error: "You must be within the office premises to check in.",
        distance: geoCheck.distance,
      },
      { status: 403 }
    );
  }

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Check if already checked in today
  const [existing] = await db.execute<RowDataPacket[]>(
    "SELECT id, checkIn FROM Attendance WHERE employeeId = ? AND date = ?",
    [payload.id, todayStr]
  );

  if ((existing as RowDataPacket[]).length > 0) {
    return NextResponse.json(
      { error: "Already checked in today.", checkIn: (existing as RowDataPacket[])[0].checkIn },
      { status: 400 }
    );
  }

  const ipAddress = getClientIP(req);
  const device = req.headers.get("user-agent") || null;
  const status = getAttendanceStatus(now);

  await db.execute<ResultSetHeader>(
    `INSERT INTO Attendance (employeeId, date, checkIn, status, latitude, longitude, ipAddress, device, distanceFromOffice)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [payload.id, todayStr, now, status, latitude, longitude, ipAddress, device, geoCheck.distance]
  );

  return NextResponse.json({
    message: "Checked in successfully.",
    checkIn: now.toISOString(),
    status,
    distance: geoCheck.distance,
  }, { status: 201 });
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
