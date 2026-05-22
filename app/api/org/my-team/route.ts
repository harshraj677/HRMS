import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  // Admin sees everyone; otherwise only direct reports
  const where: Record<string, unknown> = {
    OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
  };
  if (payload.role !== "admin") {
    where.reportingManagerId = payload.id;
  }

  const employees = await prisma.employee.findMany({
    where,
    select: {
      id: true, fullName: true, email: true, phone: true,
      department: true, position: true, role: true, createdAt: true,
      leaveBalance: true,
      profile: { select: { avatar: true, employmentStatus: true } },
    },
    orderBy: { fullName: "asc" },
  });

  // Today's attendance for each team member
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
  const enriched = await Promise.all(
    employees.map(async (e) => {
      const todayAtt = await prisma.attendance.findFirst({
        where: { employeeId: e.id, date: today },
        select: { status: true, checkIn: true, checkOut: true, hours: true },
      });
      const pendingLeaves = await prisma.leaveRequest.count({
        where: { employeeId: e.id, status: "pending" },
      });
      return { ...e, todayAttendance: todayAtt ?? null, pendingLeaves };
    })
  );

  return NextResponse.json({ team: enriched });
}

// Admin / manager can update reportingManagerId on an employee
export async function PUT(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.employeeId) return NextResponse.json({ error: "employeeId required." }, { status: 400 });

  await prisma.employee.update({
    where: { id: body.employeeId },
    data: { reportingManagerId: body.managerId || null },
  });

  return NextResponse.json({ message: "Reporting manager updated." });
}
