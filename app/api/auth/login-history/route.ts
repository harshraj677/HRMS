import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const url = new URL(req.url);
  const filterEmployeeId = url.searchParams.get("employeeId");

  const take = payload.role === "admin" ? (filterEmployeeId ? 50 : 100) : 20;
  const whereEmployeeId =
    payload.role === "admin" ? (filterEmployeeId ?? undefined) : payload.id;

  const records = await prisma.loginHistory.findMany({
    where: whereEmployeeId ? { employeeId: whereEmployeeId } : {},
    include: { employee: { select: { fullName: true } } },
    orderBy: { loginTime: "desc" },
    take,
  });

  const history = records.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    ipAddress: r.ipAddress,
    device: r.device,
    browser: r.browser,
    loginTime: r.loginTime,
    success: r.success,
    fullName: r.employee.fullName,
  }));

  return NextResponse.json({ history });
}
