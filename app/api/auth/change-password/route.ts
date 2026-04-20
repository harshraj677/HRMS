import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { RowDataPacket } from "mysql2";

/** POST /api/auth/change-password — change own password */
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.currentPassword || !body?.newPassword) {
    return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
  }

  if (body.newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
  }

  const [rows] = await db.execute<RowDataPacket[]>(
    "SELECT passwordHash FROM Employee WHERE id = ?",
    [payload.id]
  );
  const emp = (rows as RowDataPacket[])[0];
  if (!emp) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const match = await bcrypt.compare(body.currentPassword, emp.passwordHash);
  if (!match) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const newHash = await bcrypt.hash(body.newPassword, 12);
  await db.execute(
    "UPDATE Employee SET passwordHash = ?, mustChangePassword = 0 WHERE id = ?",
    [newHash, payload.id]
  );

  return NextResponse.json({ message: "Password changed successfully." });
}
