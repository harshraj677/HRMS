import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/** GET /api/suspicious — admin: view suspicious activity logs */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [rows] = await db.execute<RowDataPacket[]>(`
    SELECT sl.*, e.fullName
    FROM SuspiciousLog sl
    JOIN Employee e ON e.id = sl.employeeId
    ORDER BY sl.createdAt DESC
    LIMIT 100
  `);

  return NextResponse.json({ logs: rows });
}
