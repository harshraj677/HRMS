import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface EmployeeRow extends RowDataPacket {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  position: string | null;
  role: string;
  leaveBalance: number;
  createdAt: string;
}

/** GET /api/employees — list employees (admin only) */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [rows] = await db.execute<EmployeeRow[]>(
    "SELECT id, fullName, email, phone, department, position, role, leaveBalance, createdAt FROM Employee ORDER BY id"
  );

  return NextResponse.json({ employees: rows });
}

/** POST /api/employees — create employee (admin only) */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.fullName || !body?.email || !body?.password) {
    return NextResponse.json({ error: "fullName, email, and password are required." }, { status: 400 });
  }

  // Check duplicate email
  const [existing] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM Employee WHERE email = ?",
    [body.email.trim().toLowerCase()]
  );
  if ((existing as RowDataPacket[]).length > 0) {
    return NextResponse.json({ error: "An employee with this email already exists." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO Employee (fullName, email, phone, department, position, role, passwordHash, leaveBalance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      body.fullName.trim(),
      body.email.trim().toLowerCase(),
      body.phone?.trim() || null,
      body.department?.trim() || null,
      body.position?.trim() || null,
      body.role || "employee",
      passwordHash,
      body.leaveBalance ?? 18,
    ]
  );

  return NextResponse.json({ id: result.insertId, message: "Employee created." }, { status: 201 });
}
