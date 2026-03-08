import { NextRequest, NextResponse } from "next/server";
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

/** GET /api/employees/:id — admin can get any, employee can only get their own */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;

  // Employees may only fetch their own record
  if (payload.role !== "admin" && String(payload.id) !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const [rows] = await db.execute<EmployeeRow[]>(
    "SELECT id, fullName, email, phone, department, position, role, leaveBalance, createdAt FROM Employee WHERE id = ?",
    [id]
  );

  if ((rows as EmployeeRow[]).length === 0) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  return NextResponse.json({ employee: rows[0] });
}

/** DELETE /api/employees/:id — admin only */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const numericId = parseInt(id, 10);

  // Prevent admin from deleting themselves
  if (numericId === payload.id) {
    return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  const [result] = await db.execute<ResultSetHeader>(
    "DELETE FROM Employee WHERE id = ?",
    [numericId]
  );

  if (result.affectedRows === 0) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  return NextResponse.json({ message: "Employee deleted." });
}

/** PUT /api/employees/:id — admin can update any field; employee can update own fullName + phone */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;

  // Employees may only update their own record
  if (payload.role !== "admin" && String(payload.id) !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request body is required." }, { status: 400 });

  const fields: string[] = [];
  const values: unknown[] = [];

  // Fields any authenticated user can update on their own record
  if (body.fullName) { fields.push("fullName = ?"); values.push(body.fullName.trim()); }
  if (body.phone !== undefined) { fields.push("phone = ?"); values.push(body.phone?.trim() || null); }

  // Admin-only fields
  if (payload.role === "admin") {
    if (body.email) { fields.push("email = ?"); values.push(body.email.trim().toLowerCase()); }
    if (body.department !== undefined) { fields.push("department = ?"); values.push(body.department?.trim() || null); }
    if (body.position !== undefined) { fields.push("position = ?"); values.push(body.position?.trim() || null); }
    if (body.role) { fields.push("role = ?"); values.push(body.role); }
    if (body.leaveBalance !== undefined) { fields.push("leaveBalance = ?"); values.push(Number(body.leaveBalance)); }
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  values.push(id);
  await db.execute(`UPDATE Employee SET ${fields.join(", ")} WHERE id = ?`, values as any[]);

  return NextResponse.json({ message: "Employee updated." });
}
