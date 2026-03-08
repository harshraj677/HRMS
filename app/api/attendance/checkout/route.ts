import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/** POST /api/attendance/checkout — employee checks out for today */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  // Find today's attendance record
  const [existing] = await db.execute<RowDataPacket[]>(
    "SELECT id, checkIn, checkOut FROM Attendance WHERE employeeId = ? AND date = ?",
    [payload.id, todayStr]
  );

  const record = (existing as RowDataPacket[])[0];
  if (!record) {
    return NextResponse.json({ error: "You haven't checked in today." }, { status: 400 });
  }
  if (record.checkOut) {
    return NextResponse.json({ error: "Already checked out today.", checkOut: record.checkOut }, { status: 400 });
  }

  // Calculate hours
  const checkInTime = new Date(record.checkIn);
  const hours = parseFloat(((now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)).toFixed(2));

  await db.execute<ResultSetHeader>(
    "UPDATE Attendance SET checkOut = ?, hours = ? WHERE id = ?",
    [now, hours, record.id]
  );

  return NextResponse.json({
    message: "Checked out successfully.",
    checkOut: now.toISOString(),
    hours,
  });
}
