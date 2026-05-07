import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  if (payload.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.action || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'." },
      { status: 400 }
    );
  }

  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    select: { id: true, employeeId: true, days: true, status: true },
  });
  if (!leave) return NextResponse.json({ error: "Leave request not found." }, { status: 404 });

  if (leave.status !== "pending") {
    return NextResponse.json(
      {
        error: `Cannot ${body.action} a request that is already ${leave.status}.`,
      },
      { status: 400 }
    );
  }

  if (body.action === "approve") {
    const emp = await prisma.employee.findUnique({
      where: { id: leave.employeeId },
      select: { leaveBalance: true },
    });
    if (!emp || emp.leaveBalance < leave.days) {
      return NextResponse.json(
        { error: "Insufficient leave balance to approve." },
        { status: 400 }
      );
    }

    await prisma.leaveRequest.update({ where: { id }, data: { status: "approved" } });
    await prisma.employee.update({
      where: { id: leave.employeeId },
      data: { leaveBalance: { decrement: leave.days } },
    });

    return NextResponse.json({ message: "Leave approved.", daysDeducted: leave.days });
  } else {
    await prisma.leaveRequest.update({ where: { id }, data: { status: "rejected" } });
    return NextResponse.json({ message: "Leave rejected." });
  }
}
