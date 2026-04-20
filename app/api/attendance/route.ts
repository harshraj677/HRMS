import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/** GET /api/attendance — admin: all (or filter), employee: own */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");

  let query: string;
  let params: unknown[];

  if (payload.role === "admin") {
    if (employeeId) {
      query = `
        SELECT a.id, a.employeeId, a.date, a.checkIn, a.checkOut, a.hours, a.status,
               a.latitude, a.longitude, a.ipAddress, a.device, a.distanceFromOffice,
               e.fullName
        FROM Attendance a
        JOIN Employee e ON e.id = a.employeeId
        WHERE a.employeeId = ?
        ORDER BY a.date DESC LIMIT 60
      `;
      params = [employeeId];
    } else {
      query = `
        SELECT a.id, a.employeeId, a.date, a.checkIn, a.checkOut, a.hours, a.status,
               a.latitude, a.longitude, a.ipAddress, a.device, a.distanceFromOffice,
               e.fullName
        FROM Attendance a
        JOIN Employee e ON e.id = a.employeeId
        ORDER BY a.date DESC LIMIT 200
      `;
      params = [];
    }
  } else {
    query = `
      SELECT a.id, a.employeeId, a.date, a.checkIn, a.checkOut, a.hours, a.status,
             a.latitude, a.longitude, a.distanceFromOffice,
             e.fullName
      FROM Attendance a
      JOIN Employee e ON e.id = a.employeeId
      WHERE a.employeeId = ?
      ORDER BY a.date DESC LIMIT 60
    `;
    params = [payload.id];
  }

  const [rows] = await db.execute<RowDataPacket[]>(query, params as any[]);
  return NextResponse.json({ attendance: rows });
}
