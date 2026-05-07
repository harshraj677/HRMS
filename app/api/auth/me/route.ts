import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });

  const employee = await prisma.employee.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      department: true,
      position: true,
      phone: true,
      leaveBalance: true,
      mustChangePassword: true,
      status: true,
      createdAt: true,
    },
  });

  if (!employee) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({ user: employee });
}
