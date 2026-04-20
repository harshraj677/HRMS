import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/** GET /api/attendance/today — returns current user's today attendance */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const todayStr = new Date().toISOString().slice(0, 10);

  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT id, checkIn, checkOut, hours, status, latitude, longitude, distanceFromOffice FROM Attendance WHERE employeeId = ? AND date = ?",
    [payload.id, todayStr]
  );

  const record = (rows as RowDataPacket[])[0];

  if (!record) {
    return NextResponse.json({ checkIn: null, checkOut: null, hours: null, status: "not-checked-in", distanceFromOffice: null });
  }

  let currentStatus = record.status || "not-checked-in";
  if (!record.status) {
    if (record.checkIn && !record.checkOut) currentStatus = "present";
    else if (record.checkIn && record.checkOut) currentStatus = "completed";
  }

  // Compute live hours if still checked in
  let hours = record.hours;
  if (record.checkIn && !record.checkOut) {
    const checkInTime = new Date(record.checkIn);
    hours = parseFloat(((Date.now() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(1));
  }

  return NextResponse.json({
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    hours,
    status: currentStatus,
    distanceFromOffice: record.distanceFromOffice,
  });
}
