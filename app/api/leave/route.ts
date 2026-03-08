import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface LeaveRow extends RowDataPacket {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  createdAt: string;
  fullName: string;
  department: string | null;
  leaveBalance: number;
}

/** GET /api/leave — admin: all, employee: own */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  let query: string;
  let params: unknown[];

  if (payload.role === "admin") {
    query = `
      SELECT lr.*, e.fullName, e.department, e.leaveBalance
      FROM LeaveRequest lr
      JOIN Employee e ON e.id = lr.employeeId
      ORDER BY lr.createdAt DESC
    `;
    params = [];
  } else {
    query = `
      SELECT lr.*, e.fullName, e.department, e.leaveBalance
      FROM LeaveRequest lr
      JOIN Employee e ON e.id = lr.employeeId
      WHERE lr.employeeId = ?
      ORDER BY lr.createdAt DESC
    `;
    params = [payload.id];
  }

  const [rows] = await db.execute<LeaveRow[]>(query, params as any[]);
  return NextResponse.json({ leaves: rows });
}

/** POST /api/leave — employee applies for leave */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.startDate || !body?.endDate || !body?.reason) {
    return NextResponse.json({ error: "startDate, endDate, and reason are required." }, { status: 400 });
  }

  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Check leave balance
  const [empRows] = await db.execute<RowDataPacket[]>(
    "SELECT leaveBalance FROM Employee WHERE id = ?",
    [payload.id]
  );
  const emp = (empRows as RowDataPacket[])[0];
  if (!emp) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  if (days > emp.leaveBalance) {
    return NextResponse.json(
      { error: `Insufficient leave balance. You have ${emp.leaveBalance} day(s) remaining.` },
      { status: 400 }
    );
  }

  await db.execute<ResultSetHeader>(
    "INSERT INTO LeaveRequest (employeeId, startDate, endDate, days, reason, status) VALUES (?, ?, ?, ?, ?, 'pending')",
    [payload.id, body.startDate, body.endDate, days, body.reason.trim()]
  );

  return NextResponse.json({ message: "Leave request submitted.", days }, { status: 201 });
}
