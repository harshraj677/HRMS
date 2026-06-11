import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

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

  const emp = await prisma.employee.findUnique({
    where: { id: payload.id },
    select: { passwordHash: true, approvalStatus: true },
  });
  if (!emp) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const match = await bcrypt.compare(body.currentPassword, emp.passwordHash);
  if (!match) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  const newHash = await bcrypt.hash(body.newPassword, 12);
  const data: Record<string, unknown> = { passwordHash: newHash, mustChangePassword: false };
  if (emp.approvalStatus === "INVITED" || emp.approvalStatus === "PENDING_INVITATION") {
    data.approvalStatus = "PROFILE_IN_PROGRESS";
  }

  await prisma.employee.update({
    where: { id: payload.id },
    data,
  });

  return NextResponse.json({ message: "Password changed successfully." });
}
