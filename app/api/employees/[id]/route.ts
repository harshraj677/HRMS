import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTokenFromRequest, verifyToken } from "@/lib/auth";
import { getAdminCaller, getClientIp, createArchive, createAuditLog } from "@/lib/secureDelete";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;

  if (payload.role !== "admin" && payload.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      department: true,
      position: true,
      role: true,
      leaveBalance: true,
      createdAt: true,
    },
  });

  if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  return NextResponse.json({ employee });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await getAdminCaller(req);
  if (!caller) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const { id } = await params;
  if (id === caller.id) {
    return NextResponse.json({ error: "Cannot delete your own account." }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] },
    select: { id: true, fullName: true, email: true, phone: true, department: true, position: true, role: true, leaveBalance: true, createdAt: true },
  });
  if (!employee) return NextResponse.json({ error: "Employee not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { confirmName, archiveBeforeDelete = true, permanentPurge = false } = body;

  if (confirmName !== employee.fullName) {
    return NextResponse.json({ error: "Confirmation name does not match." }, { status: 400 });
  }
  if (permanentPurge && caller.dbRole !== "super_admin") {
    return NextResponse.json({ error: "Permanent purge requires super_admin role." }, { status: 403 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  let archiveId: string | undefined;
  if (archiveBeforeDelete) {
    const arc = await createArchive({
      sourceTable: "Employee",
      sourceId: id,
      snapshot: employee as Record<string, unknown>,
      archivedBy: caller.id,
    });
    archiveId = arc.id;
  }

  if (permanentPurge) {
    await prisma.suspiciousLog.deleteMany({ where: { employeeId: id } });
    await prisma.loginHistory.deleteMany({ where: { employeeId: id } });
    await prisma.leaveRequest.deleteMany({ where: { employeeId: id } });
    await prisma.attendance.deleteMany({ where: { employeeId: id } });
    await prisma.employee.delete({ where: { id } });
  } else {
    await prisma.employee.update({ where: { id }, data: { deletedAt: new Date(), status: "deleted" } });
  }

  const audit = await createAuditLog({
    adminId: caller.id,
    action: permanentPurge ? "PERMANENT_DELETE" : "SOFT_DELETE",
    resource: "Employee",
    resourceId: id,
    details: { archiveId, confirmName, permanentPurge },
    ip,
    userAgent,
  });

  return NextResponse.json({ success: true, auditId: audit.id, archiveId });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = getTokenFromRequest(req);
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Invalid session." }, { status: 401 });

  const { id } = await params;

  if (payload.role !== "admin" && payload.id !== id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Request body is required." }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (body.fullName) data.fullName = body.fullName.trim();
  if (body.phone !== undefined) data.phone = body.phone?.trim() || null;

  if (payload.role === "admin") {
    if (body.email) data.email = body.email.trim().toLowerCase();
    if (body.department !== undefined) data.department = body.department?.trim() || null;
    if (body.position !== undefined) data.position = body.position?.trim() || null;
    if (body.role) data.role = body.role;
    if (body.leaveBalance !== undefined) data.leaveBalance = Number(body.leaveBalance);
    if (body.reportingManagerId !== undefined) data.reportingManagerId = body.reportingManagerId || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  await prisma.employee.update({ where: { id }, data });

  return NextResponse.json({ message: "Employee updated." });
}
