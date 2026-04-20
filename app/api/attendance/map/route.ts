import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/** GET /api/attendance/map — admin: today's check-in locations for all employees */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const todayStr = new Date().toISOString().slice(0, 10);

  const [rows] = await db.execute<RowDataPacket[]>(
    `SELECT a.id, a.employeeId, e.fullName, a.latitude, a.longitude, a.checkIn, a.distanceFromOffice
     FROM Attendance a
     JOIN Employee e ON e.id = a.employeeId
     WHERE a.date = ? AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL
     ORDER BY a.checkIn DESC`,
    [todayStr]
  );

  return NextResponse.json({ markers: rows });
}
