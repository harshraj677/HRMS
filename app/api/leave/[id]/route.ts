import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { getAdminCaller, getClientIp, createArchive, createAuditLog } from "@/lib/secureDelete";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;
  const caller = await prisma.employee.findUnique({ where: { id: payload.id }, select: { role: true } });
  if (!caller || caller.role !== "admin")
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

  const managerComment = typeof body.comment === "string" ? body.comment.trim() : undefined;

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

    await prisma.leaveRequest.update({ where: { id }, data: { status: "approved", approvedBy: payload.id, managerComment: managerComment ?? null } });
    await prisma.employee.update({
      where: { id: leave.employeeId },
      data: { leaveBalance: { decrement: leave.days } },
    });
    await prisma.notification.create({
      data: {
        recipientId: leave.employeeId,
        title: "Leave Approved",
        message: `Your ${leave.days}-day leave request has been approved.`,
        type: "leave_approved",
        link: "/dashboard/leave",
      },
    });

    return NextResponse.json({ message: "Leave approved.", daysDeducted: leave.days });
  } else {
    await prisma.leaveRequest.update({ where: { id }, data: { status: "rejected", managerComment: managerComment ?? null } });
    await prisma.notification.create({
      data: {
        recipientId: leave.employeeId,
        title: "Leave Rejected",
        message: `Your ${leave.days}-day leave request has been rejected.`,
        type: "leave_rejected",
        link: "/dashboard/leave",
      },
    });
    return NextResponse.json({ message: "Leave rejected." });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const caller = await getAdminCaller(req);
  if (!caller) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  const leave = await prisma.leaveRequest.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    include: { employee: { select: { fullName: true, email: true, department: true } } },
  });
  if (!leave) return NextResponse.json({ error: "Leave request not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { confirmName, archiveBeforeDelete = true, permanentPurge = false } = body;

  // confirmName must match the employee's full name for this leave request
  if (confirmName !== leave.employee.fullName) {
    return NextResponse.json({ error: "Confirmation name does not match." }, { status: 400 });
  }
  if (permanentPurge && caller.dbRole !== "super_admin") {
    return NextResponse.json({ error: "Permanent purge requires super_admin role." }, { status: 403 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  let archiveId: string | undefined;
  if (archiveBeforeDelete) {
    const { employee, ...leaveData } = leave;
    const arc = await createArchive({
      sourceTable: "LeaveRequest",
      sourceId: id,
      snapshot: { ...leaveData, employeeName: employee.fullName } as Record<string, unknown>,
      archivedBy: caller.id,
    });
    archiveId = arc.id;
  }

  if (permanentPurge) {
    await prisma.leaveRequest.delete({ where: { id } });
  } else {
    await prisma.leaveRequest.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  const audit = await createAuditLog({
    adminId: caller.id,
    action: permanentPurge ? "PERMANENT_DELETE" : "SOFT_DELETE",
    resource: "LeaveRequest",
    resourceId: id,
    details: { archiveId, confirmName, permanentPurge },
    ip,
    userAgent,
  });

  return NextResponse.json({ success: true, auditId: audit.id, archiveId });
}
