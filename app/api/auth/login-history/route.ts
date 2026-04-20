import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/** GET /api/auth/login-history — admin: all, employee: own */
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
        SELECT lh.*, e.fullName
        FROM LoginHistory lh
        JOIN Employee e ON e.id = lh.employeeId
        WHERE lh.employeeId = ?
        ORDER BY lh.loginTime DESC LIMIT 50
      `;
      params = [employeeId];
    } else {
      query = `
        SELECT lh.*, e.fullName
        FROM LoginHistory lh
        JOIN Employee e ON e.id = lh.employeeId
        ORDER BY lh.loginTime DESC LIMIT 100
      `;
      params = [];
    }
  } else {
    query = `
      SELECT lh.*, e.fullName
      FROM LoginHistory lh
      JOIN Employee e ON e.id = lh.employeeId
      WHERE lh.employeeId = ?
      ORDER BY lh.loginTime DESC LIMIT 20
    `;
    params = [payload.id];
  }

  const [rows] = await db.execute<RowDataPacket[]>(query, params as any[]);
  return NextResponse.json({ history: rows });
}
