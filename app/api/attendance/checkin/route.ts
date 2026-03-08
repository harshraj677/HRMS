import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket, ResultSetHeader } from "mysql2";

/** POST /api/attendance/checkin — employee checks in for today */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Check if already checked in today
  const [existing] = await db.execute<RowDataPacket[]>(
    "SELECT id, checkIn FROM Attendance WHERE employeeId = ? AND date = ?",
    [payload.id, todayStr]
  );

  if ((existing as RowDataPacket[]).length > 0) {
    return NextResponse.json({ error: "Already checked in today.", checkIn: (existing as RowDataPacket[])[0].checkIn }, { status: 400 });
  }

  await db.execute<ResultSetHeader>(
    "INSERT INTO Attendance (employeeId, date, checkIn) VALUES (?, ?, ?)",
    [payload.id, todayStr, now]
  );

  return NextResponse.json({
    message: "Checked in successfully.",
    checkIn: now.toISOString(),
  }, { status: 201 });
}
