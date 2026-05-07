import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const records = await prisma.leaveRequest.findMany({
    where: payload.role === "admin" ? {} : { employeeId: payload.id },
    include: {
      employee: { select: { fullName: true, department: true, leaveBalance: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const leaves = records.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    startDate: r.startDate,
    endDate: r.endDate,
    days: r.days,
    reason: r.reason,
    status: r.status,
    approvedBy: r.approvedBy,
    createdAt: r.createdAt,
    fullName: r.employee.fullName,
    department: r.employee.department,
    leaveBalance: r.employee.leaveBalance,
  }));

  return NextResponse.json({ leaves });
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.startDate || !body?.endDate || !body?.reason) {
    return NextResponse.json(
      { error: "startDate, endDate, and reason are required." },
      { status: 400 }
    );
  }

  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return NextResponse.json({ error: "Invalid date range." }, { status: 400 });
  }

  const days =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const emp = await prisma.employee.findUnique({
    where: { id: payload.id },
    select: { leaveBalance: true },
  });
  if (!emp) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  if (days > emp.leaveBalance) {
    return NextResponse.json(
      {
        error: `Insufficient leave balance. You have ${emp.leaveBalance} day(s) remaining.`,
      },
      { status: 400 }
    );
  }

  await prisma.leaveRequest.create({
    data: {
      employeeId: payload.id,
      startDate: start,
      endDate: end,
      days,
      reason: body.reason.trim(),
      status: "pending",
    },
  });

  return NextResponse.json({ message: "Leave request submitted.", days }, { status: 201 });
}
