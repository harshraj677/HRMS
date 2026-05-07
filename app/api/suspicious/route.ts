import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const records = await prisma.suspiciousLog.findMany({
    include: { employee: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const logs = records.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    type: r.type,
    description: r.description,
    ipAddress: r.ipAddress,
    createdAt: r.createdAt,
    fullName: r.employee.fullName,
  }));

  return NextResponse.json({ logs });
}
