import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { sendCredentialsEmail } from "@/lib/email";
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
  status: string;
  createdAt: string;
}

/** GET /api/employees — admin only */
export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const [rows] = await db.execute<EmployeeRow[]>(
    "SELECT id, fullName, email, phone, department, position, role, leaveBalance, status, createdAt FROM Employee ORDER BY id"
  );

  return NextResponse.json({ employees: rows });
}

/** POST /api/employees — create employee (admin only), auto-generate password & send email */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.fullName || !body?.email) {
    return NextResponse.json({ error: "fullName and email are required." }, { status: 400 });
  }

  const emailAddr = body.email.trim().toLowerCase();

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddr)) {
    return NextResponse.json({ error: "Invalid email format." }, { status: 400 });
  }

  // Check duplicate email
  const [existing] = await db.execute<RowDataPacket[]>(
    "SELECT id FROM Employee WHERE email = ?",
    [emailAddr]
  );
  if ((existing as RowDataPacket[]).length > 0) {
    return NextResponse.json({ error: "An employee with this email already exists." }, { status: 409 });
  }

  // Generate random password
  const randomPassword = crypto.randomBytes(4).toString("hex") + "A1!";
  const passwordHash = await bcrypt.hash(randomPassword, 12);

  const [result] = await db.execute<ResultSetHeader>(
    `INSERT INTO Employee (fullName, email, phone, department, position, role, passwordHash, leaveBalance, mustChangePassword, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.fullName.trim(),
      emailAddr,
      body.phone?.trim() || null,
      body.department?.trim() || null,
      body.position?.trim() || null,
      body.role || "employee",
      passwordHash,
      body.leaveBalance ?? 18,
      true,
      "active",
    ]
  );

  // Send credentials email (non-blocking)
  sendCredentialsEmail({
    email: emailAddr,
    fullName: body.fullName.trim(),
    password: randomPassword,
  }).catch(() => {});

  return NextResponse.json({
    id: result.insertId,
    message: "Employee created. Login credentials have been sent via email.",
    generatedPassword: randomPassword,
  }, { status: 201 });
}
