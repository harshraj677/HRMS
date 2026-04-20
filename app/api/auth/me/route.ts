import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  // Fetch fresh data from DB to include leaveBalance, status, etc.
  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT id, fullName, email, role, department, position, phone, leaveBalance, mustChangePassword, status, createdAt FROM Employee WHERE id = ?",
    [payload.id]
  );

  const employee = (rows as RowDataPacket[])[0];
  if (!employee) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: employee.id,
      fullName: employee.fullName,
      email: employee.email,
      role: employee.role,
      department: employee.department,
      position: employee.position,
      phone: employee.phone,
      leaveBalance: employee.leaveBalance,
      mustChangePassword: !!employee.mustChangePassword,
      status: employee.status,
      createdAt: employee.createdAt,
    },
  });
}
